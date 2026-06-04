#!/bin/bash
# Yeni eklenen endpoint'lere odaklı smoke test
# Excel export, bulk action, partner detail, RBAC, documents, notifications, reports
set -u
BASE="${BASE:-http://localhost:3000}"
PASS=0
FAIL=0
FAILS=()

G='\033[0;32m'
R='\033[0;31m'
Y='\033[0;33m'
N='\033[0m'

ADMIN_TOKEN=$(curl -s -X POST "$BASE/api/auth/login" -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | grep -oE '"token":"[^"]+"' | sed 's/"token":"//;s/"$//')

if [ -z "$ADMIN_TOKEN" ]; then
  echo -e "${R}KRITIK: Admin token alınamadı${N}"
  exit 1
fi

check() {
  local method="$1"; local path="$2"; local expected="$3"; local desc="$4"; local body="${5:-}"; local token="${6:-$ADMIN_TOKEN}"
  local headers=(-H "Content-Type: application/json")
  if [ -n "$token" ]; then headers+=(-H "Authorization: Bearer $token"); fi
  local args=("$method" "$BASE$path")
  if [ -n "$body" ]; then args+=(-d "$body"); fi
  local status
  status=$(curl -s -o /tmp/last_resp.json -w "%{http_code}" -X "${args[@]}" "${headers[@]}")
  if [ "$status" = "$expected" ]; then
    echo -e "${G}✓${N} [$status] $method $path — $desc"
    PASS=$((PASS+1))
  else
    echo -e "${R}✗${N} [$status, beklenen $expected] $method $path — $desc"
    cat /tmp/last_resp.json | head -c 200; echo
    FAIL=$((FAIL+1))
    FAILS+=("$method $path → $status (beklenen $expected)")
  fi
}

# Test user oluştur (RBAC test için user rolünde)
echo -e "${Y}[SETUP] Test user oluşturuluyor (user rolünde)${N}"
TEST_USER_RESP=$(curl -s -X POST "$BASE/api/users" -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"username":"smoketestuser","password":"test1234","full_name":"Smoke Test","email":"smoke@test.com","role":"user","status":"active"}')
TEST_USER_ID=$(echo "$TEST_USER_RESP" | grep -oE '"id":[0-9]+' | head -1 | sed 's/"id"://')
USER_TOKEN=""
if [ -n "$TEST_USER_ID" ]; then
  USER_TOKEN=$(curl -s -X POST "$BASE/api/auth/login" -H "Content-Type: application/json" \
    -d '{"username":"smoketestuser","password":"test1234"}' | grep -oE '"token":"[^"]+"' | sed 's/"token":"//;s/"$//')
  echo "  test user id=$TEST_USER_ID, token alındı"
fi

# === [1] RBAC — login response permissions ===
echo -e "\n${Y}[1] RBAC — login response & me endpoint${N}"
PERMS_COUNT=$(curl -s -X POST "$BASE/api/auth/login" -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}' \
  | grep -oE '"permissions":\[[^]]*\]' | grep -oE '","' | wc -l)
if [ "$PERMS_COUNT" -gt 20 ]; then
  echo -e "${G}✓${N} admin login response includes permissions (~$PERMS_COUNT)"
  PASS=$((PASS+1))
else
  echo -e "${R}✗${N} admin permissions count = $PERMS_COUNT (>20 bekleniyor)"
  FAIL=$((FAIL+1))
fi
check GET "/api/auth/me" 200 "/me endpoint"
check GET "/api/auth/permissions" 200 "tüm permission tanımları"

# === [2] RBAC — user 403 ===
echo -e "\n${Y}[2] RBAC — user rolü kısıtlamaları${N}"
if [ -n "$USER_TOKEN" ]; then
  check GET "/api/audit?limit=10" 403 "user audit'e erişemez" "" "$USER_TOKEN"
  check POST "/api/shipments/bulk-action" 403 "user bulk-action'a erişemez" '{"ids":[1],"action":"delete"}' "$USER_TOKEN"
  check GET "/api/reports/monthly-revenue?year=2026" 403 "user reports'a erişemez" "" "$USER_TOKEN"
else
  echo -e "${R}✗${N} user token alınamadı, RBAC testleri atlandı"
  FAIL=$((FAIL+1))
fi

# === [3] BULK ACTION ===
echo -e "\n${Y}[3] Bulk Action — sevkiyat toplu işlem${N}"
check POST "/api/shipments/bulk-action" 400 "ids boş → error" '{"action":"delete"}'
check POST "/api/shipments/bulk-action" 400 "geçersiz action" '{"ids":[1,2],"action":"foo"}'
check POST "/api/shipments/bulk-action" 400 "set_status için status eksik" '{"ids":[1],"action":"set_status"}'
check POST "/api/shipments/bulk-action" 400 "geçersiz status" '{"ids":[1],"action":"set_status","status":"foo"}'
# Gerçek bulk işlem: status değişimi (gerçek ID'lerle)
check POST "/api/shipments/bulk-action" 200 "set_status geçerli" '{"ids":[2],"action":"set_status","status":"in_progress"}'

# === [4] PARTNER DETAIL ===
echo -e "\n${Y}[4] Partner Detail${N}"
check GET "/api/partners/1" 200 "partner tek detay"
check GET "/api/partners/1/shipments" 200 "partner sevkiyat geçmişi"
check GET "/api/partners/999999" 404 "olmayan partner"

# === [5] DOCUMENTS ===
echo -e "\n${Y}[5] Documents — versiyonlama${N}"
check GET "/api/documents/1/commercial_invoice/versions" 200 "versions liste"
check POST "/api/documents/1/nonexistent/restore?version=1" 404 "olmayan versiyon restore"

# === [6] NOTIFICATIONS ===
echo -e "\n${Y}[6] Notifications${N}"
check GET "/api/notifications" 200 "bildirim listesi"
check GET "/api/notifications/unread-count" 200 "okunmamış sayısı"
check POST "/api/notifications/999999/read" 200 "olmayan id read (idempotent)"
check POST "/api/notifications/read-all" 200 "tümünü okundu işaretle"

# === [7] REPORTS ===
echo -e "\n${Y}[7] Reports${N}"
check GET "/api/reports/monthly-revenue?year=2026" 200 "aylık ciro"
check GET "/api/reports/monthly-revenue?year=2026&transport_type=road" 200 "aylık ciro (mod filtreli)"
check GET "/api/reports/customer-ranking?year=2026" 200 "müşteri sıralaması"
check GET "/api/reports/customer-ranking?year=2026&limit=5" 200 "müşteri sıralaması (limit)"
check GET "/api/reports/aging" 200 "yaşlanan alacak"
check GET "/api/reports/vehicle-utilization" 200 "araç doluluk (varsayılan 30 gün)"
check GET "/api/reports/vehicle-utilization?start=2026-01-01&end=2026-12-31" 200 "araç doluluk (tarih aralığı)"
check GET "/api/reports/user-performance?year=2026" 200 "personel performansı (admin only)"
if [ -n "$USER_TOKEN" ]; then
  check GET "/api/reports/user-performance?year=2026" 403 "personel performansı user→403" "" "$USER_TOKEN"
fi

# === [8] DATA QUALITY checks ===
echo -e "\n${Y}[8] Data Quality — response yapısı${N}"
MONTHLY=$(curl -s "$BASE/api/reports/monthly-revenue?year=2026" -H "Authorization: Bearer $ADMIN_TOKEN")
if echo "$MONTHLY" | python -c "import json,sys; d=json.load(sys.stdin); assert d['success']; assert len(d['data']['series']) == 12; assert 'totals' in d['data']" 2>/dev/null; then
  echo -e "${G}✓${N} monthly-revenue yapısı doğru (12 ay + totals)"
  PASS=$((PASS+1))
else
  echo -e "${R}✗${N} monthly-revenue yapısı bozuk"
  FAIL=$((FAIL+1))
fi
AGING=$(curl -s "$BASE/api/reports/aging" -H "Authorization: Bearer $ADMIN_TOKEN")
if echo "$AGING" | python -c "import json,sys; d=json.load(sys.stdin); assert d['success']; assert len(d['data']['buckets']) == 4" 2>/dev/null; then
  echo -e "${G}✓${N} aging yapısı doğru (4 bucket)"
  PASS=$((PASS+1))
else
  echo -e "${R}✗${N} aging yapısı bozuk"
  FAIL=$((FAIL+1))
fi

# === [9] AUDIT TRAIL bütünlüğü — bulk action audit yazdı mı? ===
echo -e "\n${Y}[9] Audit Trail — bulk action izlemesi${N}"
AUDIT_LAST=$(curl -s "$BASE/api/audit?entity_type=shipments&entity_id=2&limit=5" -H "Authorization: Bearer $ADMIN_TOKEN")
if echo "$AUDIT_LAST" | python -c "import json,sys; d=json.load(sys.stdin); items=d['data']; bulk=[i for i in items if isinstance(i.get('changes'),dict) and isinstance(i['changes'].get('status'),dict) and i['changes']['status'].get('_bulk')]; sys.exit(0 if bulk else 1)" 2>/dev/null; then
  echo -e "${G}✓${N} bulk action audit kaydı bulundu (_bulk: true marker)"
  PASS=$((PASS+1))
else
  echo -e "${R}✗${N} bulk action audit kaydı bulunamadı"
  FAIL=$((FAIL+1))
fi

# === CLEANUP ===
if [ -n "$TEST_USER_ID" ]; then
  echo -e "\n${Y}[CLEANUP] test user silme${N}"
  curl -s -X DELETE "$BASE/api/users/$TEST_USER_ID" -H "Authorization: Bearer $ADMIN_TOKEN" > /dev/null
  echo "  test user id=$TEST_USER_ID silindi"
fi

echo
echo "================================"
echo -e "${G}Geçen:    $PASS${N}"
echo -e "${R}Başarısız: $FAIL${N}"
if [ $FAIL -gt 0 ]; then
  echo "Başarısız listesi:"
  for f in "${FAILS[@]}"; do echo "  - $f"; done
  exit 1
fi
exit 0
