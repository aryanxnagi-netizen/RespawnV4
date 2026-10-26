-- RLS / security tests. Each test prints PASS or FAIL. Run after both migrations.
-- Usage:  psql -v ON_ERROR_STOP=0 -f supabase/tests/10_security_tests.sql  (as a superuser)
\set QUIET on
\pset tuples_only on
\pset format unaligned

create or replace function pg_temp.expect(name text, ok boolean) returns void language plpgsql as $$
begin raise notice '% %', case when ok then 'PASS' else 'FAIL' end, name; end $$;

-- run a statement as a given user; returns true if it raised an error (i.e. was blocked)
create or replace function pg_temp.blocked(uid uuid, role_name text, stmt text) returns boolean language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(uid::text, ''), true);
  execute format('set local role %I', role_name);
  begin execute stmt; exception when others then reset role; return true; end;
  reset role; return false;
end $$;

-- run a count query as a given user
create or replace function pg_temp.count_as(uid uuid, role_name text, q text) returns bigint language plpgsql as $$
declare n bigint;
begin
  perform set_config('request.jwt.claim.sub', coalesce(uid::text, ''), true);
  execute format('set local role %I', role_name);
  execute 'select count(*) from (' || q || ') s' into n;
  reset role; return n;
end $$;

-- ---------- fixtures (as superuser) ----------
insert into auth.users (id, email) values
 ('00000000-0000-0000-0000-00000000000a','alice@example.test'),
 ('00000000-0000-0000-0000-00000000000b','bob@example.test'),
 ('00000000-0000-0000-0000-00000000000c','mod@example.test');
insert into public.profiles (id, username, visibility, bio) values
 ('00000000-0000-0000-0000-00000000000a','Alice_A','public','alice bio'),
 ('00000000-0000-0000-0000-00000000000b','Bob_B','private','bob private bio'),
 ('00000000-0000-0000-0000-00000000000c','Mod_C','public','mod');
insert into public.user_roles (user_id, role) values ('00000000-0000-0000-0000-00000000000c','moderator');
insert into public.posts (id, author_id, body) values
 ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000a','alice public post'),
 ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-00000000000b','bob private-profile post');
insert into public.user_game_handles values ('00000000-0000-0000-0000-00000000000a','bgmi','ALICE-SECRET-ID');
insert into public.user_games (user_id, game_id, rank) values ('00000000-0000-0000-0000-00000000000a','bgmi','Gold');

-- more helpers
create or replace function pg_temp.affected(uid uuid, role_name text, stmt text) returns bigint language plpgsql as $$
declare n bigint;
begin
  perform set_config('request.jwt.claim.sub', coalesce(uid::text, ''), true);
  execute format('set local role %I', role_name);
  begin execute stmt; get diagnostics n = row_count; exception when others then reset role; return -1; end;
  reset role; return n;
end $$;
create or replace function pg_temp.val_as(uid uuid, role_name text, q text) returns text language plpgsql as $$
declare t text;
begin
  perform set_config('request.jwt.claim.sub', coalesce(uid::text, ''), true);
  execute format('set local role %I', role_name);
  begin execute q into t; exception when others then reset role; return 'ERROR: ' || sqlerrm; end;
  reset role; return t;
end $$;

\set A '''00000000-0000-0000-0000-00000000000a'''
\set B '''00000000-0000-0000-0000-00000000000b'''
\set C '''00000000-0000-0000-0000-00000000000c'''

-- ===== profiles & privacy =====
select pg_temp.expect('anon sees public profiles only (Alice+Mod, not private Bob)', pg_temp.count_as(null,'anon','select 1 from public.profiles') = 2);
select pg_temp.expect('Bob sees his own private profile', pg_temp.count_as(:B,'authenticated','select 1 from public.profiles where id = '||:'B') = 1);
select pg_temp.expect('Alice cannot see Bob''s private profile', pg_temp.count_as(:A,'authenticated','select 1 from public.profiles where id = '||:'B') = 0);
select pg_temp.expect('user cannot set suspended on own profile', pg_temp.blocked(:A,'authenticated','update public.profiles set suspended = true where id = '||:'A'));
select pg_temp.expect('Alice cannot edit Bob''s profile (0 rows touched)', pg_temp.affected(:A,'authenticated','update public.profiles set bio = ''hacked'' where id = '||:'B') = 0);
select pg_temp.expect('Alice can edit her own bio', pg_temp.affected(:A,'authenticated','update public.profiles set bio = ''new bio'' where id = '||:'A') = 1);
select pg_temp.expect('user cannot create a profile for someone else', pg_temp.blocked(:A,'authenticated','insert into public.profiles (id, username) values ('||:'B'||', ''Fake_Bob'')'));
select pg_temp.expect('username uniqueness is case-insensitive', (select count(*) = 0 from (select 1 where false) x) and
  (select not exists (select 1 from public.profiles where username_norm = 'alice_a') is false));
do $$ begin
  begin insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000dd');
        insert into public.profiles (id, username) values ('00000000-0000-0000-0000-0000000000dd','ALICE_a');
        raise notice 'FAIL duplicate username differing only by case was accepted';
  exception when unique_violation then raise notice 'PASS duplicate username differing only by case is rejected'; end;
end $$;
do $$ begin
  begin insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000ee');
        insert into public.profiles (id, username) values ('00000000-0000-0000-0000-0000000000ee','x y!');
        raise notice 'FAIL invalid username accepted';
  exception when check_violation then raise notice 'PASS invalid username characters are rejected'; end;
end $$;

-- ===== roles =====
select pg_temp.expect('user cannot grant themselves a role', pg_temp.blocked(:A,'authenticated','insert into public.user_roles values ('||:'A'||', ''admin'')'));
select pg_temp.expect('roles table is invisible to clients (RLS, 0 rows although a role row exists)', (select count(*) from public.user_roles) = 1 and pg_temp.count_as(:A,'authenticated','select 1 from public.user_roles') = 0);

-- ===== posts =====
select pg_temp.expect('Alice sees her own post', pg_temp.count_as(:A,'authenticated','select 1 from public.posts where id = ''10000000-0000-0000-0000-000000000001''') = 1);
select pg_temp.expect('anon sees public author''s post', pg_temp.count_as(null,'anon','select 1 from public.posts where id = ''10000000-0000-0000-0000-000000000001''') = 1);
select pg_temp.expect('Alice cannot read post of a private-profile author', pg_temp.count_as(:A,'authenticated','select 1 from public.posts where id = ''10000000-0000-0000-0000-000000000002''') = 0);
select pg_temp.expect('Alice cannot post as Bob', pg_temp.blocked(:A,'authenticated','insert into public.posts (author_id, body) values ('||:'B'||', ''spoof'')'));
select pg_temp.expect('Alice can post as herself', pg_temp.affected(:A,'authenticated','insert into public.posts (author_id, body) values ('||:'A'||', ''hello'')') = 1);
select pg_temp.expect('Alice cannot edit Bob''s post (0 rows)', pg_temp.affected(:A,'authenticated','update public.posts set body = ''x'' where author_id = '||:'B') = 0);
select pg_temp.expect('Alice cannot delete Bob''s post (0 rows)', pg_temp.affected(:A,'authenticated','delete from public.posts where author_id = '||:'B') = 0);
select pg_temp.expect('user cannot change moderation_status of own post', pg_temp.blocked(:A,'authenticated','update public.posts set moderation_status = ''visible'' where author_id = '||:'A'));
select pg_temp.expect('post body over 280 chars is rejected', pg_temp.blocked(:A,'authenticated','insert into public.posts (author_id, body) values ('||:'A'||', repeat(''x'', 281))'));

-- blocks hide content both ways
insert into public.posts (author_id, body) values (:C, 'mod public post');
select pg_temp.expect('Alice sees Mod''s public post before blocking', pg_temp.count_as(:A,'authenticated','select 1 from public.posts where author_id = '||:'C') = 1);
select pg_temp.expect('Alice can block Mod', pg_temp.affected(:A,'authenticated','insert into public.blocks values ('||:'A'||','||:'C'||')') = 1);
select pg_temp.expect('after block, Alice no longer sees Mod''s post', pg_temp.count_as(:A,'authenticated','select 1 from public.posts where author_id = '||:'C') = 0);
select pg_temp.expect('after block, Mod no longer sees Alice''s posts either', pg_temp.count_as(:C,'authenticated','select 1 from public.posts where author_id = '||:'A') = 0);
select pg_temp.expect('Bob cannot forge a block as Alice', pg_temp.blocked(:B,'authenticated','insert into public.blocks values ('||:'A'||','||:'B'||')'));

-- ===== private in-game IDs & verification =====
select pg_temp.expect('owner can read her private in-game ID', pg_temp.count_as(:A,'authenticated','select 1 from public.user_game_handles') = 1);
select pg_temp.expect('other users cannot read in-game IDs', pg_temp.count_as(:B,'authenticated','select 1 from public.user_game_handles') = 0);
select pg_temp.expect('anon cannot read in-game IDs', pg_temp.blocked(null,'anon','select * from public.user_game_handles'));
select pg_temp.expect('public user_games row exposes no handle column', not exists (select 1 from information_schema.columns where table_name='user_games' and column_name like '%handle%'));
select pg_temp.expect('Bob can see Alice''s public game rows', pg_temp.count_as(:B,'authenticated','select 1 from public.user_games where user_id = '||:'A') = 1);
select pg_temp.expect('user cannot self-verify a rank', pg_temp.blocked(:A,'authenticated','update public.user_games set verification_status = ''game_confirmed'' where user_id = '||:'A'));
select pg_temp.expect('new game rows default to self_reported', (select verification_status from public.user_games where user_id = :A) = 'self_reported');

-- ===== reports & moderation =====
select pg_temp.expect('Alice can file a report', pg_temp.affected(:A,'authenticated','insert into public.reports (reporter_id, target_type, target_id, category) values ('||:'A'||',''post'',''x'',''Spam'')') = 1);
select pg_temp.expect('report cannot be filed in someone else''s name', pg_temp.blocked(:B,'authenticated','insert into public.reports (reporter_id, target_type, target_id, category) values ('||:'A'||',''post'',''x'',''Spam'')'));
select pg_temp.expect('Bob cannot read Alice''s report', pg_temp.count_as(:B,'authenticated','select 1 from public.reports') = 0);
select pg_temp.expect('moderator can read the report queue', pg_temp.count_as(:C,'authenticated','select 1 from public.reports') = 1);
select pg_temp.expect('non-moderator cannot moderate a post', pg_temp.val_as(:A,'authenticated','select public.moderate_post(''10000000-0000-0000-0000-000000000001'',''removed'',''x'')::text') like 'ERROR:%not authorized%');
select pg_temp.val_as(:C,'authenticated','select public.moderate_post(''10000000-0000-0000-0000-000000000001'',''hidden'',''test'')::text') as r \gset
select pg_temp.expect('moderator can moderate a post', :'r' not like 'ERROR:%' and (select moderation_status from public.posts where id='10000000-0000-0000-0000-000000000001') = 'hidden');
select pg_temp.expect('moderation wrote an audit-log row', (select count(*) from public.admin_audit_logs where action='moderate_post') = 1);
select pg_temp.expect('regular users cannot read audit logs', pg_temp.count_as(:A,'authenticated','select 1 from public.admin_audit_logs') = 0);
select pg_temp.expect('audit log cannot be edited by clients (0 rows, unchanged)', pg_temp.affected(:C,'authenticated','update public.admin_audit_logs set action = ''x''') = 0 and (select count(*) from public.admin_audit_logs where action = 'moderate_post') = 1);
select pg_temp.expect('hidden post disappears from the author''s own feed query', pg_temp.count_as(:A,'authenticated','select 1 from public.posts where id=''10000000-0000-0000-0000-000000000001''') = 0);

-- ===== notifications =====
select pg_temp.expect('clients cannot fabricate notifications', pg_temp.blocked(:A,'authenticated','insert into public.notifications (user_id, kind, body) values ('||:'A'||',''reward'',''You won 1000 coins'')'));

-- ===== coins: clients cannot write =====
select pg_temp.expect('every profile got a zero wallet', (select count(*) from public.coin_wallets where balance = 0) >= 3);
select pg_temp.expect('client cannot UPDATE own balance', pg_temp.blocked(:A,'authenticated','update public.coin_wallets set balance = 999999 where user_id = '||:'A'));
select pg_temp.expect('client cannot INSERT a wallet', pg_temp.blocked(:A,'authenticated','insert into public.coin_wallets (user_id, balance) values ('||:'A'||', 5)'));
select pg_temp.expect('client cannot INSERT a ledger row', pg_temp.blocked(:A,'authenticated','insert into public.coin_transactions (user_id, amount, kind, reason, idempotency_key) values ('||:'A'||', 500, ''mission'', ''free'', ''forged-key-0001'')'));
select pg_temp.expect('client cannot DELETE ledger rows', pg_temp.blocked(:A,'authenticated','delete from public.coin_transactions'));
select pg_temp.expect('client cannot call grant_coins', pg_temp.blocked(:A,'authenticated','select public.grant_coins('||:'A'||', 500, ''mission'', ''self'', ''self-grant-0001'')'));
select pg_temp.expect('anon cannot call grant_coins', pg_temp.blocked(null,'anon','select public.grant_coins('||:'A'||', 500, ''mission'', ''self'', ''anon-grant-0001'')'));
select pg_temp.expect('client cannot claim a cosmetic directly', pg_temp.blocked(:A,'authenticated','insert into public.user_cosmetics (user_id, cosmetic_id) values ('||:'A'||', ''holo'')'));
select pg_temp.expect('client cannot change catalog prices', pg_temp.blocked(:A,'authenticated','update public.cosmetic_catalog set price = 0'));
select pg_temp.expect('negative balance is impossible at the table level', (select pg_temp.blocked(null,'service_role','update public.coin_wallets set balance = -1')));
select pg_temp.expect('zero-value ledger rows are rejected', pg_temp.blocked(null,'service_role','insert into public.coin_transactions (user_id, amount, kind, reason, idempotency_key) values ('||:'A'||', 0, ''mission'', ''x'', ''zero-amount-0001'')'));

-- ===== coins: server grants & idempotency =====
select pg_temp.expect('service role can grant coins', pg_temp.val_as(null,'service_role','select public.grant_coins('||:'A'||', 500, ''mission'', ''Daily mission'', ''grant-test-0001'')::text') like '%"granted"%');
select pg_temp.val_as(null,'service_role','select public.grant_coins('||:'A'||', 500, ''mission'', ''Daily mission'', ''grant-test-0001'')::text') as r \gset
select pg_temp.expect('replaying the same grant does NOT pay twice', :'r' like '%already_applied%' and (select balance from public.coin_wallets where user_id = :A) = 500 and (select count(*) from public.coin_transactions where idempotency_key='grant-test-0001') = 1);
select pg_temp.expect('grant rejects negative amounts', pg_temp.val_as(null,'service_role','select public.grant_coins('||:'A'||', -50, ''mission'', ''x'', ''grant-test-0002'')::text') like 'ERROR:%');
select pg_temp.expect('Alice can read her wallet and ledger but not Bob''s', pg_temp.count_as(:A,'authenticated','select 1 from public.coin_wallets') = 1 and pg_temp.count_as(:A,'authenticated','select 1 from public.coin_transactions') = 1);

-- ===== coins: spending =====
select pg_temp.val_as(:A,'authenticated','select public.spend_coins(''holo'', ''spend-test-0001'')::text') as r \gset
select pg_temp.expect('Alice buys a 250-coin cosmetic (500 -> 250)', :'r' like '%purchased%' and (select balance from public.coin_wallets where user_id = :A) = 250);
select pg_temp.val_as(:A,'authenticated','select public.spend_coins(''holo'', ''spend-test-0001'')::text') as r \gset
select pg_temp.expect('double-tap / replay charges nothing extra', :'r' like '%already_applied%' and (select balance from public.coin_wallets where user_id = :A) = 250 and (select count(*) from public.coin_transactions where idempotency_key='spend-test-0001') = 1);
select pg_temp.expect('cannot buy an item already owned (new key)', pg_temp.val_as(:A,'authenticated','select public.spend_coins(''holo'', ''spend-test-0002'')::text') like 'ERROR:%already owned%');
select pg_temp.val_as(:A,'authenticated','select public.spend_coins(''founder'', ''spend-test-0003'')::text') as r \gset
select pg_temp.expect('cannot overspend (250 < 600); balance unchanged, nothing recorded', :'r' like 'ERROR:%insufficient%' and (select balance from public.coin_wallets where user_id = :A) = 250 and not exists (select 1 from public.coin_transactions where idempotency_key='spend-test-0003'));
select pg_temp.expect('Bob with 0 coins cannot buy', pg_temp.val_as(:B,'authenticated','select public.spend_coins(''legend'', ''spend-test-0004'')::text') like 'ERROR:%insufficient%');
select pg_temp.expect('Bob cannot reuse Alice''s idempotency key', pg_temp.val_as(:B,'authenticated','select public.spend_coins(''legend'', ''spend-test-0001'')::text') like 'ERROR:%');
select pg_temp.expect('unknown item is rejected', pg_temp.val_as(:A,'authenticated','select public.spend_coins(''does-not-exist'', ''spend-test-0005'')::text') like 'ERROR:%unknown item%');
select pg_temp.expect('anon cannot spend', pg_temp.blocked(null,'anon','select public.spend_coins(''holo'', ''spend-test-0006'')'));
select pg_temp.expect('ledger is consistent: sum(amount) == balance for every wallet',
  not exists (select 1 from public.coin_wallets w where w.balance <> coalesce((select sum(amount) from public.coin_transactions t where t.user_id = w.user_id and t.status='completed'),0)));
select pg_temp.expect('Alice now owns the item', pg_temp.count_as(:A,'authenticated','select 1 from public.user_cosmetics where cosmetic_id = ''holo''') = 1);
