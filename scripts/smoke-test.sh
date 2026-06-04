#!/bin/bash
# Backend smoke test
set -u
BASE="${BASE:-http://localhost:3000}"
PASS=0
FAIL=0
FAILS=()

G='\033[0;32m'
R='\033[0;31m'
Y='\033[0;33m'
N='\033[0m'

# Token al
TOKEN=$(curl -s -X POST "$BASE/api/auth/login" -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | grep -oE '"token":"[^"]+"' | sed 's/"token":"//;s/"$//')

if [ -z "$TOKEN" ]; then
  echo -e "${R}KRITIK: Token alınamadı${N}"
  exit 1
fi

check() {
  local method="$1"
  local path="$2"
  local expected="$3"
  local desc="$4"
  local body="${5:-}"
  local with_auth="${6:-yes}"

  local code
  if [ "$with_auth" = "yes" ]; then
    if [ -n "$body" ]; then
      code=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$BASE$path" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d "$body")
    else
      code=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$BASE$path" \
        -H "Authorization: Bearer $TOKEN")
    fi
  else
    if [ -n "$body" ]; then
      code=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$BASE$path" \
        -H "Content-Type: application/json" -d "$body")
    else
      code=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$BASE$path")
    fi
  fi

  if [ "$code" = "$expected" ]; then
    echo -e "${G}✓${N} [$code] $method $path — $desc"
    PASS=$((PASS+1))
  else
    echo -e "${R}✗${N} [$code, beklenen $expected] $method $path — $desc"
    FAIL=$((FAIL+1))
    FAILS+=("$method $path → $code (beklenen $expected)")
  fi
}

check_ctype() {
  local method="$1"
  local path="$2"
  local expected_ctype="$3"
  local desc="$4"
  local body="${5:-}"

  local ctype
  if [ -n "$body" ]; then
    ctype=$(curl -s -o /dev/null -w "%{content_type}" -X "$method" "$BASE$path" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" -d "$body")
  else
    ctype=$(curl -s -o /dev/null -w "%{content_type}" -X "$method" "$BASE$path" \
      -H "Authorization: Bearer $TOKEN")
  fi

  if [[ "$ctype" == *"$expected_ctype"* ]]; then
    echo -e "${G}✓${N} [$expected_ctype] $method $path — $desc"
    PASS=$((PASS+1))
  else
    echo -e "${R}✗${N} [$ctype, beklenen *$expected_ctype*] $method $path — $desc"
    FAIL=$((FAIL+1))
  fi
}

echo "================================"
echo "CargoTrack Backend Smoke Test"
echo "================================"

echo -e "\n${Y}[1] AUTH${N}"
check POST /api/auth/login 200 "valid login" '{"username":"admin","password":"admin123"}' no
check POST /api/auth/login 401 "invalid password" '{"username":"admin","password":"yanlis"}' no
check POST /api/auth/login 400 "empty body" '{}' no
check GET /api/auth/me 200 "me with token"
check GET /api/auth/me 401 "me without token" "" no

echo -e "\n${Y}[2] SHIPMENTS${N}"
check GET "/api/shipments?transport_type=road" 200 "list road"
check GET "/api/shipments?transport_type=maritime" 200 "list maritime"
check GET "/api/shipments?transport_type=air" 200 "list air"
check GET "/api/shipments?transport_type=storage" 200 "list storage"
check GET "/api/shipments/1" 200 "get single"
check GET "/api/shipments/99999" 404 "get nonexistent"

echo -e "\n${Y}[3] PARTNERS${N}"
check GET "/api/partners" 200 "list all"
check GET "/api/partners?type=customer" 200 "filter customer"
check GET "/api/partners?type=sender" 200 "filter sender"

echo -e "\n${Y}[4] WAREHOUSES${N}"
check GET "/api/warehouses" 200 "list"

echo -e "\n${Y}[5] VEHICLES${N}"
check GET "/api/vehicles" 200 "list all"
check GET "/api/vehicles?transport_type=road" 200 "filter road"
check GET "/api/vehicles?transport_type=sea" 200 "filter sea"
check GET "/api/vehicles?transport_type=air" 200 "filter air"

echo -e "\n${Y}[6] ASSIGNMENTS${N}"
check GET "/api/assignments" 200 "list"

echo -e "\n${Y}[7] USERS${N}"
check GET "/api/users" 200 "list (super_admin)"

echo -e "\n${Y}[8] STATISTICS${N}"
check POST "/api/statistics" 200 "stats" '{"date_from":"2026-01-01","date_to":"2026-12-31","currency":"EUR"}'

echo -e "\n${Y}[9] EXCHANGE RATES${N}"
check GET "/api/exchange-rates" 200 "list rates"

echo -e "\n${Y}[10] NEW (Faz K-M)${N}"
check GET "/api/audit?limit=10" 200 "audit log"
check GET "/api/storage-orders" 200 "storage orders"
check GET "/api/lookup/vehicle-summary" 200 "vehicle summary"
check GET "/api/lookup/warehouse-summary" 200 "warehouse summary"
check GET "/api/lookup/sidebar-alerts" 200 "sidebar alerts"

echo -e "\n${Y}[11] PDF (token query param)${N}"
check_ctype GET "/api/pdf/file-cover/1?token=$TOKEN" "pdf" "file-cover PDF"
check_ctype GET "/api/pdf/proforma/1?token=$TOKEN" "pdf" "proforma PDF"
check_ctype GET "/api/pdf/barcodes/1?token=$TOKEN" "pdf" "barcodes PDF"

echo -e "\n${Y}[12] EXCEL EXPORT${N}"
check_ctype POST "/api/statistics/export-excel" "excel" "stats Excel" '{"date_from":"2026-01-01","date_to":"2026-12-31","currency":"EUR"}'

echo -e "\n${Y}[13] SECURITY${N}"
check GET "/api/shipments?transport_type=road" 401 "shipments without token" "" no
check GET "/api/users" 401 "users without token" "" no
check GET "/api/audit" 401 "audit without token" "" no
check DELETE "/api/shipments/1" 401 "delete without token" "" no

echo -e "\n${Y}[14] CRUD smoke${N}"
PARTNER_BODY='{"type":"customer","company_name":"SMOKE-TEST-İŞ A.Ş.","city":"İstanbul","country":"Türkiye"}'
NEW_ID=$(curl -s -X POST "$BASE/api/partners" -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" -d "$PARTNER_BODY" | grep -oE '"id":[0-9]+' | head -1 | sed 's/"id"://')
if [ -n "$NEW_ID" ]; then
  echo -e "${G}✓${N} Partner create (id=$NEW_ID)"
  PASS=$((PASS+1))
  check DELETE "/api/partners/$NEW_ID" 200 "delete created"
else
  echo -e "${R}✗${N} Partner create failed"
  FAIL=$((FAIL+1))
fi

echo -e "\n================================"
echo -e "${G}Geçen:    $PASS${N}"
echo -e "${R}Başarısız: $FAIL${N}"
if [ ${#FAILS[@]} -gt 0 ]; then
  echo "Başarısız:"
  for f in "${FAILS[@]}"; do echo "  - $f"; done
fi

[ "$FAIL" = "0" ] && exit 0 || exit 1
