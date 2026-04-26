#!/bin/bash
# Smoke test for the Kassa admin endpoints.
# Usage:
#   export JWT="eyJ..."  (ElyHub session token from localStorage)
#   bash scripts/test-admin.sh

set -e
API="${API:-https://elyhub-api-prod.riseytg1.workers.dev}"

if [ -z "$JWT" ]; then
  echo "ERROR: export JWT=<your_elyhub_session_token> first"
  exit 1
fi

H_AUTH="authorization: Bearer $JWT"
H_JSON="content-type: application/json"

echo "=== 1. /admin/whoami ==="
curl -sS "$API/admin/whoami" -H "$H_AUTH" | python3 -m json.tool
echo

echo "=== 2. /admin/licenses/list (scope=all, limit=5) ==="
curl -sS "$API/admin/licenses/list" \
  -H "$H_AUTH" -H "$H_JSON" \
  -d '{"status":"all","limit":5}' | python3 -m json.tool
echo

echo "=== 3. /admin/clients/list (scope=all, limit=5) ==="
curl -sS "$API/admin/clients/list" \
  -H "$H_AUTH" -H "$H_JSON" \
  -d '{"scope":"all","limit":5}' | python3 -m json.tool
echo

echo "=== Done ==="
