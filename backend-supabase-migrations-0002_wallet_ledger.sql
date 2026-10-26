-- =====================================================================
-- RESPAWN — migration 0002: server-owned coin wallet + cosmetics
--
-- STATUS: DRAFT. NOT executed. NOT tested. Run 0001 first.
--
-- Core rule: the client can READ its own wallet and ledger, and can call
-- exactly one write function (spend_coins). It can never insert, update or
-- delete wallet/ledger rows, never grant coins, and never claim a cosmetic.
-- Coins are non-cash virtual items. There is no payment code in here.
-- =====================================================================

create table if not exists public.coin_wallets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  balance bigint not null default 0 check (balance >= 0),          -- can never go negative
  updated_at timestamptz not null default now()
);

-- Append-only ledger. Idempotency key is globally unique => a replayed request
-- (double tap, retry, replay attack) cannot apply twice.
create table if not exists public.coin_transactions (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount bigint not null check (amount <> 0),                      -- + earn, - spend
  kind text not null check (kind in ('mission','achievement','tournament','event','purchase','adjustment')),
  reason text not null check (char_length(reason) <= 200),
  idempotency_key text not null unique check (char_length(idempotency_key) between 8 and 120),
  status text not null default 'completed' check (status in ('pending','completed','reversed')),
  created_at timestamptz not null default now()
);
create index if not exists coin_tx_user_idx on public.coin_transactions (user_id, created_at desc);

create table if not exists public.cosmetic_catalog (
  id text primary key,
  kind text not null check (kind in ('theme','banner','frame','font','badge','title','background','layout')),
  name text not null,
  price bigint not null default 0 check (price >= 0),              -- 0 = free for everyone
  limited boolean not null default false,
  active boolean not null default true
);
create table if not exists public.user_cosmetics (
  user_id uuid not null references public.profiles(id) on delete cascade,
  cosmetic_id text not null references public.cosmetic_catalog(id),
  acquired_at timestamptz not null default now(),
  tx_id bigint references public.coin_transactions(id),
  primary key (user_id, cosmetic_id)
);

alter table public.coin_wallets enable row level security;
alter table public.coin_transactions enable row level security;
alter table public.cosmetic_catalog enable row level security;
alter table public.user_cosmetics enable row level security;

-- Clients: read-only access to their own rows. No write grants of any kind.
revoke all on public.coin_wallets, public.coin_transactions, public.user_cosmetics, public.cosmetic_catalog from anon, authenticated;
grant select on public.coin_wallets, public.coin_transactions, public.user_cosmetics to authenticated;
grant select on public.cosmetic_catalog to anon, authenticated;

create policy wallet_read on public.coin_wallets for select to authenticated using (user_id = (select auth.uid()));
create policy tx_read on public.coin_transactions for select to authenticated using (user_id = (select auth.uid()));
create policy owned_read on public.user_cosmetics for select to authenticated using (user_id = (select auth.uid()));
create policy catalog_read on public.cosmetic_catalog for select to anon, authenticated using (active);
-- (no insert/update/delete policies exist => every client write is denied)

-- Every new profile gets a zero-balance wallet.
create or replace function public.create_wallet() returns trigger language plpgsql security definer set search_path = ''
as $$ begin insert into public.coin_wallets (user_id) values (new.id) on conflict do nothing; return new; end $$;
create trigger profiles_create_wallet after insert on public.profiles for each row execute function public.create_wallet();

-- ---------------------------------------------------------------------
-- spend_coins: the ONLY way a client changes its balance, and only downward,
-- only for a catalog item at the catalog price. All checks are server-side.
-- ---------------------------------------------------------------------
create or replace function public.spend_coins(p_cosmetic text, p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  item public.cosmetic_catalog%rowtype;
  existing public.coin_transactions%rowtype;
  new_balance bigint;
  tx bigint;
begin
  if uid is null then raise exception 'not signed in' using errcode = '28000'; end if;

  -- Replay of an already-applied request returns the original result, charges nothing.
  select * into existing from public.coin_transactions where idempotency_key = p_idempotency_key;
  if found then
    if existing.user_id <> uid then raise exception 'invalid request' using errcode = '42501'; end if;
    select balance into new_balance from public.coin_wallets where user_id = uid;
    return jsonb_build_object('status','already_applied','balance',new_balance);
  end if;

  select * into item from public.cosmetic_catalog where id = p_cosmetic and active;
  if not found then raise exception 'unknown item'; end if;
  if item.price = 0 then raise exception 'item is free; no purchase needed'; end if;
  if exists (select 1 from public.user_cosmetics where user_id = uid and cosmetic_id = item.id) then
    raise exception 'already owned';
  end if;

  -- Row lock serialises concurrent spends for this user (prevents double-spend races).
  select balance into new_balance from public.coin_wallets where user_id = uid for update;
  if not found then raise exception 'no wallet'; end if;
  if new_balance < item.price then raise exception 'insufficient coins'; end if;

  insert into public.coin_transactions (user_id, amount, kind, reason, idempotency_key)
  values (uid, -item.price, 'purchase', 'Cosmetic: ' || item.name, p_idempotency_key)
  returning id into tx;

  update public.coin_wallets set balance = balance - item.price, updated_at = now() where user_id = uid
  returning balance into new_balance;

  insert into public.user_cosmetics (user_id, cosmetic_id, tx_id) values (uid, item.id, tx);
  return jsonb_build_object('status','purchased','balance',new_balance,'item',item.id);
end $$;
revoke all on function public.spend_coins(text, text) from public, anon;
grant execute on function public.spend_coins(text, text) to authenticated;

-- ---------------------------------------------------------------------
-- grant_coins: SERVER ONLY. Callable by the service role (an Edge Function or
-- admin tool that has verified the reason, e.g. a verified tournament result).
-- It is NOT executable by anon or authenticated users.
-- ---------------------------------------------------------------------
create or replace function public.grant_coins(p_user uuid, p_amount bigint, p_kind text, p_reason text, p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare existing_id bigint; new_balance bigint;
begin
  if p_amount <= 0 then raise exception 'amount must be positive'; end if;
  if p_kind not in ('mission','achievement','tournament','event','adjustment') then raise exception 'invalid kind'; end if;
  select id into existing_id from public.coin_transactions where idempotency_key = p_idempotency_key;
  if found then
    select balance into new_balance from public.coin_wallets where user_id = p_user;
    return jsonb_build_object('status','already_applied','balance',new_balance);
  end if;
  insert into public.coin_wallets (user_id) values (p_user) on conflict do nothing;
  select balance into new_balance from public.coin_wallets where user_id = p_user for update;
  insert into public.coin_transactions (user_id, amount, kind, reason, idempotency_key) values (p_user, p_amount, p_kind, left(p_reason, 200), p_idempotency_key);
  update public.coin_wallets set balance = balance + p_amount, updated_at = now() where user_id = p_user returning balance into new_balance;
  return jsonb_build_object('status','granted','balance',new_balance);
end $$;
revoke all on function public.grant_coins(uuid, bigint, text, text, text) from public, anon, authenticated;
grant execute on function public.grant_coins(uuid, bigint, text, text, text) to service_role;

-- Seed: free items need no ownership; priced items are the locked cosmetics.
insert into public.cosmetic_catalog (id, kind, name, price) values
 ('nebula','background','Nebula drift',400), ('holo','frame','Holo ring',250), ('founder','badge','Founder',600), ('legend','title','Squad Legend',300)
on conflict (id) do nothing;
