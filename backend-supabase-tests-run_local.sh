#!/usr/bin/env bash
# Runs both migrations + the security tests against a THROW-AWAY local PostgreSQL.
# Needs the PostgreSQL server binaries (initdb, pg_ctl, psql). Does not touch any real database.
# Usage:  bash supabase/tests/run_local.sh
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; ROOT="$(dirname "$(dirname "$HERE")")"
BIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | head -1 || true)"
[ -n "$BIN" ] || { echo "PostgreSQL server binaries not found (looked in /usr/lib/postgresql/*/bin)"; exit 2; }

WORK="$(mktemp -d /var/tmp/respawn-pg.XXXXXX)"; PORT=54329
RUN=""; if [ "$(id -u)" = "0" ]; then RUN="runuser -u postgres --"; chown postgres "$WORK"; fi
cp "$HERE"/00_supabase_stub.sql "$HERE"/10_security_tests.sql "$ROOT"/supabase/migrations/*.sql "$WORK"/; chmod 644 "$WORK"/*.sql
cleanup() { $RUN "$BIN/pg_ctl" -D "$WORK/data" stop -m fast >/dev/null 2>&1 || true; rm -rf "$WORK"; }
trap cleanup EXIT

$RUN "$BIN/initdb" -D "$WORK/data" -A trust >/dev/null
$RUN "$BIN/pg_ctl" -D "$WORK/data" -o "-p $PORT -k $WORK -c listen_addresses=''" -l "$WORK/pg.log" -w start >/dev/null
Q() { $RUN "$BIN/psql" -h "$WORK" -p $PORT -q "$@"; }
$RUN "$BIN/createdb" -h "$WORK" -p $PORT rs
for f in 00_supabase_stub 0001_core_schema 0002_wallet_ledger; do Q -d rs -v ON_ERROR_STOP=1 -f "$WORK/$f.sql"; done
Q -d rs -f "$WORK/10_security_tests.sql" 2>&1 | sed 's/^psql:[^:]*:[0-9]*: //' > "$WORK/out.txt"
grep -E "NOTICE:  (PASS|FAIL)" "$WORK/out.txt" | sed 's/NOTICE:  //'
P=$(grep -c "NOTICE:  PASS" "$WORK/out.txt" || true); F=$(grep -c "NOTICE:  FAIL" "$WORK/out.txt" || true)
echo; echo "security tests: $P passed, $F failed"
grep -E "^ERROR" "$WORK/out.txt" && { echo "unexpected SQL errors above"; exit 1; } || true
[ "$F" = "0" ] && [ "$P" -gt 0 ]
