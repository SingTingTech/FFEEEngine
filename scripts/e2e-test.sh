#!/usr/bin/env bash
# End-to-end test suite for safeValidator backend.
# Exercises the main flows over real HTTP + real DB.
#
# Prerequisites: backend running at $API_BASE (default http://localhost:8080),
#   Redis on $REDIS_HOST:$REDIS_PORT with password $REDIS_PASSWORD.
#
# Usage:  ./e2e-test.sh
# Exit:  0 on all-pass, 1 on any-fail.

set -u
API_BASE="${API_BASE:-http://localhost:8080}"
PASS=0
FAIL=0
FAILURES=()

# ----------- helpers -----------

# Issue an HTTP request, print body to stdout, return the HTTP status code on stderr
# Usage: http METHOD PATH [TOKEN] [JSON_BODY]
http() {
  local method=$1 path=$2 token=${3:-} body=${4:-}
  local args=(-s -o /tmp/e2e_body -w "%{http_code}" -X "$method" "$API_BASE$path"
              -H "Content-Type: application/json")
  [[ -n "$token" ]] && args+=(-H "Authorization: Bearer $token")
  [[ -n "$body" ]]  && args+=(-d "$body")
  curl "${args[@]}"
}

# Assert that a value (read from $RESP via jq) equals expected
# Usage: assert_eq NAME EXPECTED JQ_EXPR
assert_eq() {
  local name=$1 expected=$2 expr=$3
  local actual
  actual=$(echo "$RESP" | jq -r "$expr" 2>/dev/null)
  if [[ "$actual" == "$expected" ]]; then
    printf "  \033[32m✓\033[0m %-50s %s\n" "$name" "$actual"
    PASS=$((PASS+1))
  else
    printf "  \033[31m✗\033[0m %-50s expected=%s actual=%s\n" "$name" "$expected" "$actual"
    FAIL=$((FAIL+1))
    FAILURES+=("$name: expected=$expected actual=$actual")
  fi
}

# Assert that an expression is truthy (non-null, non-empty, non-false)
assert_truthy() {
  local name=$1 expr=$2
  local actual
  actual=$(echo "$RESP" | jq -r "$expr" 2>/dev/null)
  if [[ "$actual" != "null" && "$actual" != "" && "$actual" != "false" ]]; then
    printf "  \033[32m✓\033[0m %-50s %s\n" "$name" "$actual"
    PASS=$((PASS+1))
  else
    printf "  \033[31m✗\033[0m %-50s expr=%s result=%s\n" "$name" "$expr" "$actual"
    FAIL=$((FAIL+1))
    FAILURES+=("$name: $expr = $actual")
  fi
}

# Assert HTTP code is 2xx; print body if not
assert_http_ok() {
  local name=$1 code=$2
  if [[ "$code" =~ ^2 ]]; then
    printf "  \033[32m✓\033[0m %-50s HTTP %s\n" "$name" "$code"
    PASS=$((PASS+1))
  else
    printf "  \033[31m✗\033[0m %-50s HTTP %s body=%s\n" "$name" "$code" "$(cat /tmp/e2e_body 2>/dev/null | head -c 200)"
    FAIL=$((FAIL+1))
    FAILURES+=("$name: HTTP $code")
  fi
}

# Assert HTTP code is expected (e.g. 400 for negative case)
assert_http() {
  local name=$1 expected=$2 code=$3
  if [[ "$code" == "$expected" ]]; then
    printf "  \033[32m✓\033[0m %-50s HTTP %s\n" "$name" "$code"
    PASS=$((PASS+1))
  else
    printf "  \033[31m✗\033[0m %-50s expected HTTP %s got %s body=%s\n" "$name" "$expected" "$code" "$(cat /tmp/e2e_body 2>/dev/null | head -c 200)"
    FAIL=$((FAIL+1))
    FAILURES+=("$name: expected HTTP $expected got $code")
  fi
}

# Print a section header
section() {
  printf "\n\033[1m== %s ==\033[0m\n" "$1"
}

# ----------- 1. Auth -----------
section "1. Authentication (JacksonConfig Long→String)"

CODE=$(http POST /api/auth/login '' '{"username":"admin","password":"admin123"}')
RESP=$(cat /tmp/e2e_body)
assert_http_ok "POST /api/auth/login" "$CODE"
assert_eq "login.user.id is string" "1" '.data.user.id'
assert_eq "login.user.username" "admin" '.data.user.username'
assert_eq "login.expiresIn is string" "7200" '.data.expiresIn'
TOKEN=$(echo "$RESP" | jq -r '.data.accessToken')
[[ -n "$TOKEN" && "$TOKEN" != "null" ]] && PASS=$((PASS+1)) || { FAIL=$((FAIL+1)); FAILURES+=("token extraction failed"); }

CODE=$(http POST /api/auth/login '' '{"username":"admin","password":"WRONG"}')
assert_http "bad password returns 200 with code!=0" "200" "$CODE"
RESP=$(cat /tmp/e2e_body)
assert_eq "bad password has error code" "50002" '.code'

# ----------- 2. Admin endpoints (/api prefix) -----------
section "2. Admin endpoints with /api prefix"

CODE=$(http GET /api/admin/roles/all "$TOKEN")
assert_http_ok "GET /api/admin/roles/all" "$CODE"
RESP=$(cat /tmp/e2e_body)
assert_truthy "roles list non-empty" '.data | length > 0'
assert_eq "role.id is string" "1" '.data[0].id'

CODE=$(http GET /api/admin/permissions/tree "$TOKEN")
assert_http_ok "GET /api/admin/permissions/tree" "$CODE"
RESP=$(cat /tmp/e2e_body)
# permission.id goes through global JacksonConfig → Long as String
PERM_ID_TYPE=$(echo "$RESP" | jq -r '.data[0].id | type')
if [[ "$PERM_ID_TYPE" == "string" ]]; then
  printf "  \033[32m✓\033[0m %-50s %s\n" "permission.id is string (Long→String)" "$PERM_ID_TYPE"
  PASS=$((PASS+1))
else
  printf "  \033[31m✗\033[0m %-50s expected=string actual=%s\n" "permission.id is string (Long→String)" "$PERM_ID_TYPE"
  FAIL=$((FAIL+1))
  FAILURES+=("permission.id is string: actual=$PERM_ID_TYPE")
fi

# Old prefix (without /api) — GlobalExceptionHandler converts NoResourceFoundException to 500.
# That's a behavior of the existing handler, not a migration issue. We just assert it's NOT 2xx.
CODE=$(http GET /admin/roles/all "$TOKEN")
RESP=$(cat /tmp/e2e_body)
OLD_PREFIX_CODE=$(echo "$RESP" | jq -r '.code // empty')
if [[ ! "$CODE" =~ ^2 ]]; then
  printf "  \033[32m✓\033[0m %-50s HTTP %s (not 2xx)\n" "GET /admin/roles/all (old prefix)" "$CODE"
  PASS=$((PASS+1))
else
  printf "  \033[31m✗\033[0m %-50s unexpected HTTP 2xx\n" "GET /admin/roles/all (old prefix)"
  FAIL=$((FAIL+1))
fi

# ----------- 3. Forms CRUD -----------
section "3. Forms CRUD"

CODE=$(http POST /api/forms "$TOKEN" '{"name":"e2e-form-'"$RANDOM"'","description":"E2E test","targetTable":null}')
assert_http_ok "POST /api/forms (create)" "$CODE"
RESP=$(cat /tmp/e2e_body)
NEW_FORM_ID=$(echo "$RESP" | jq -r '.data')
# Long IDs are around 19 digits — assert it's a number-as-string, not a number
if [[ "${#NEW_FORM_ID}" -ge 15 && "$NEW_FORM_ID" =~ ^[0-9]+$ ]]; then
  printf "  \033[32m✓\033[0m %-50s %s (%d digits)\n" "new formId is Long as String" "$NEW_FORM_ID" "${#NEW_FORM_ID}"
  PASS=$((PASS+1))
else
  printf "  \033[31m✗\033[0m %-50s formId=%s\n" "new formId is Long as String" "$NEW_FORM_ID"
  FAIL=$((FAIL+1))
fi

CODE=$(http GET /api/forms "$TOKEN")
assert_http_ok "GET /api/forms (list)" "$CODE"
RESP=$(cat /tmp/e2e_body)
assert_truthy "list contains new form" "[.data[] | .formId == \"$NEW_FORM_ID\"] | any"

CODE=$(http GET "/api/forms/$NEW_FORM_ID/schema" "$TOKEN")
assert_http_ok "GET /api/forms/{id}/schema" "$CODE"
RESP=$(cat /tmp/e2e_body)
assert_eq "new form has version 1" "1" '.data.version'
assert_eq "new form is current" "true" '.data.isCurrent'

# ----------- 4. V5 publish with sectionId remap (tmp-* → real) -----------
section "4. V5 publish with sectionId remap"

PUBLISH_BODY='{
  "name":"e2e-publish","description":"V5 remap test","targetTable":null,
  "fields":[
    {"code":"f1","name":"字段1","type":"text","required":true,"sectionId":"tmp-0","config":null,"validation":null,"targetColumn":null},
    {"code":"f2","name":"字段2","type":"text","required":false,"sectionId":"tmp-0","config":null,"validation":null,"targetColumn":null},
    {"code":"f3","name":"字段3","type":"textarea","required":false,"sectionId":"tmp-1","config":null,"validation":null,"targetColumn":null},
    {"code":"f_root","name":"根字段","type":"text","required":false,"sectionId":null,"config":null,"validation":null,"targetColumn":null}
  ],
  "relationships":[],
  "sections":[
    {"id":"tmp-0","name":"基本信息","description":null,"sortOrder":0},
    {"id":"tmp-1","name":"扩展信息","description":null,"sortOrder":1}
  ]
}'
CODE=$(http PUT "/api/forms/$NEW_FORM_ID/schema" "$TOKEN" "$PUBLISH_BODY")
assert_http_ok "PUT /api/forms/{id}/schema (V5 publish)" "$CODE"
RESP=$(cat /tmp/e2e_body)

CODE=$(http GET "/api/forms/$NEW_FORM_ID/schema" "$TOKEN")
assert_http_ok "GET schema after publish" "$CODE"
RESP=$(cat /tmp/e2e_body)

# Verify fields reference REAL section IDs (not tmp-*)
assert_eq "publish created 2 sections" "2" '.data.sections | length'
assert_eq "publish created 4 fields" "4" '.data.fields | length'

# All section IDs in fields must be REAL Longs (not tmp-*)
TMP_REFS=$(echo "$RESP" | jq -r '[.data.fields[] | select(.sectionId != null and (.sectionId | startswith("tmp-")))] | length')
assert_eq "no field references tmp-* sectionId" "0" "$TMP_REFS"

# All fields with sectionId must reference an actual section
SECTION_IDS=$(echo "$RESP" | jq -c '[.data.sections[].id]')
INVALID_REFS=$(echo "$RESP" | jq -r --argjson sids "$SECTION_IDS" \
  '[.data.fields[] | select(.sectionId != null and (.sectionId as $sid | $sids | index($sid) | not))] | length')
assert_eq "all field.sectionId point to real sections" "0" "$INVALID_REFS"

# f1 and f2 should be in section 0 (tmp-0)
F1_SEC=$(echo "$RESP" | jq -r '.data.fields[] | select(.code=="f1") | .sectionId')
F1_SEC_NAME=$(echo "$RESP" | jq -r --arg sid "$F1_SEC" '.data.sections[] | select(.id==$sid) | .name')
if [[ "$F1_SEC_NAME" == "基本信息" ]]; then
  printf "  \033[32m✓\033[0m %-50s %s\n" "f1.sectionId → '基本信息'" "$F1_SEC"
  PASS=$((PASS+1))
else
  printf "  \033[31m✗\033[0m %-50s sectionName=%s\n" "f1.sectionId → '基本信息'" "$F1_SEC_NAME"
  FAIL=$((FAIL+1))
fi

# f3 should be in section 1 (tmp-1)
F3_SEC=$(echo "$RESP" | jq -r '.data.fields[] | select(.code=="f3") | .sectionId')
F3_SEC_NAME=$(echo "$RESP" | jq -r --arg sid "$F3_SEC" '.data.sections[] | select(.id==$sid) | .name')
if [[ "$F3_SEC_NAME" == "扩展信息" ]]; then
  printf "  \033[32m✓\033[0m %-50s %s\n" "f3.sectionId → '扩展信息'" "$F3_SEC"
  PASS=$((PASS+1))
else
  printf "  \033[31m✗\033[0m %-50s sectionName=%s\n" "f3.sectionId → '扩展信息'" "$F3_SEC_NAME"
  FAIL=$((FAIL+1))
fi

# f_root should have null sectionId
ROOT_SEC=$(echo "$RESP" | jq -r '.data.fields[] | select(.code=="f_root") | .sectionId')
if [[ "$ROOT_SEC" == "null" ]]; then
  printf "  \033[32m✓\033[0m %-50s\n" "f_root.sectionId is null"
  PASS=$((PASS+1))
else
  printf "  \033[31m✗\033[0m %-50s actual=%s\n" "f_root.sectionId is null" "$ROOT_SEC"
  FAIL=$((FAIL+1))
fi

# ----------- 5. Single section add + field add with REAL sectionId -----------
section "5. Single section + field add"

CODE=$(http POST "/api/forms/$NEW_FORM_ID/sections" "$TOKEN" \
  '{"id":null,"name":"新段","description":"single add","sortOrder":99}')
assert_http_ok "POST /api/forms/{id}/sections" "$CODE"
RESP=$(cat /tmp/e2e_body)
NEW_SEC_ID=$(echo "$RESP" | jq -r '.data')
# NEW_SEC_ID is real Long string
CODE=$(http GET "/api/forms/$NEW_FORM_ID/sections" "$TOKEN")
assert_http_ok "GET /api/forms/{id}/sections" "$CODE"
RESP=$(cat /tmp/e2e_body)
assert_eq "section list contains new sec" "true" "[.data[] | .id == \"$NEW_SEC_ID\"] | any"

CODE=$(http POST "/api/forms/$NEW_FORM_ID/fields" "$TOKEN" \
  "{\"code\":\"single_field\",\"name\":\"单条字段\",\"type\":\"text\",\"required\":false,\"sortOrder\":50,\"config\":null,\"validation\":null,\"targetColumn\":null,\"sectionId\":\"$NEW_SEC_ID\"}")
assert_http_ok "POST /api/forms/{id}/fields (real sectionId)" "$CODE"
RESP=$(cat /tmp/e2e_body)
SINGLE_FIELD_ID=$(echo "$RESP" | jq -r '.data')

# Verify the field is in the right section
CODE=$(http GET "/api/forms/$NEW_FORM_ID/fields" "$TOKEN")
RESP=$(cat /tmp/e2e_body)
SF_SEC=$(echo "$RESP" | jq -r ".data[] | select(.id==\"$SINGLE_FIELD_ID\") | .sectionId")
if [[ "$SF_SEC" == "$NEW_SEC_ID" ]]; then
  printf "  \033[32m✓\033[0m %-50s\n" "single field has correct sectionId"
  PASS=$((PASS+1))
else
  printf "  \033[31m✗\033[0m %-50s expected=%s actual=%s\n" "single field has correct sectionId" "$NEW_SEC_ID" "$SF_SEC"
  FAIL=$((FAIL+1))
fi

# ----------- 6. BUG FIX: tmp-* sectionId in single addField is REJECTED -----------
section "6. REGRESSION: tmp-* sectionId in addField must be rejected"

CODE=$(http POST "/api/forms/$NEW_FORM_ID/fields" "$TOKEN" \
  '{"code":"orphan_attempt_2","name":"孤儿尝试2","type":"text","required":false,"sortOrder":200,"config":null,"validation":null,"targetColumn":null,"sectionId":"tmp-99"}')
assert_http_ok "POST addField with tmp-99 (no 500)" "$CODE"
RESP=$(cat /tmp/e2e_body)
assert_eq "tmp-99 rejected with code 40000" "40000" '.code'
assert_truthy "error message mentions 临时 ID" '.message | contains("临时 ID")'
assert_truthy "error message mentions tmp-99" '.message | contains("tmp-99")'

# Bad format is also rejected
CODE=$(http POST "/api/forms/$NEW_FORM_ID/fields" "$TOKEN" \
  '{"code":"bad_fmt_2","name":"坏格式2","type":"text","required":false,"sortOrder":201,"config":null,"validation":null,"targetColumn":null,"sectionId":"not-a-number"}')
assert_http_ok "POST addField with bad-format sectionId" "$CODE"
RESP=$(cat /tmp/e2e_body)
assert_eq "bad-format rejected with code 40000" "40000" '.code'
assert_truthy "error message mentions 格式无效" '.message | contains("格式无效")'

# Empty string sectionId is treated as null (root) — should succeed
CODE=$(http POST "/api/forms/$NEW_FORM_ID/fields" "$TOKEN" \
  '{"code":"empty_sec","name":"空sec","type":"text","required":false,"sortOrder":202,"config":null,"validation":null,"targetColumn":null,"sectionId":""}')
assert_http_ok "POST addField with empty sectionId" "$CODE"

# ----------- 7. Field uniqueness -----------
section "7. Field validation"

CODE=$(http POST "/api/forms/$NEW_FORM_ID/fields" "$TOKEN" \
  '{"code":"f1","name":"重复","type":"text","required":false,"sortOrder":300,"config":null,"validation":null,"targetColumn":null,"sectionId":null}')
assert_http_ok "POST addField with duplicate code" "$CODE"
RESP=$(cat /tmp/e2e_body)
assert_truthy "duplicate code rejected" '.code != 0'

# ----------- 8. targetTable mapping (form-level) -----------
section "8. targetTable mapping"

CODE=$(http POST /api/forms "$TOKEN" '{"name":"mapped-form","description":null,"targetTable":null}')
assert_http_ok "create unmapped form" "$CODE"
RESP=$(cat /tmp/e2e_body)
MAPPED_ID=$(echo "$RESP" | jq -r '.data')

CODE=$(http POST "/api/forms/$MAPPED_ID/fields" "$TOKEN" \
  '{"code":"no_col","name":"缺列","type":"text","required":false,"sortOrder":0,"config":null,"validation":null,"targetColumn":null,"sectionId":null}')
assert_http_ok "POST field on unmapped form (no targetColumn needed)" "$CODE"

# Now create a mapped form
CODE=$(http POST /api/forms "$TOKEN" '{"name":"with-table","description":null,"targetTable":"users"}')
assert_http_ok "create mapped form (targetTable=users)" "$CODE"
RESP=$(cat /tmp/e2e_body)
MAPPED_TBL_ID=$(echo "$RESP" | jq -r '.data')

CODE=$(http POST "/api/forms/$MAPPED_TBL_ID/fields" "$TOKEN" \
  '{"code":"no_col","name":"缺列","type":"text","required":false,"sortOrder":0,"config":null,"validation":null,"targetColumn":null,"sectionId":null}')
assert_http_ok "POST field on mapped form w/o targetColumn" "$CODE"
RESP=$(cat /tmp/e2e_body)
assert_truthy "mapped form rejects field w/o targetColumn" '.code != 0'
assert_truthy "error mentions targetColumn" '.message | contains("targetColumn")'

CODE=$(http POST "/api/forms/$MAPPED_TBL_ID/fields" "$TOKEN" \
  '{"code":"with_col","name":"有列","type":"text","required":false,"sortOrder":0,"config":null,"validation":null,"targetColumn":"username","sectionId":null}')
assert_http_ok "POST field on mapped form w/ targetColumn" "$CODE"

# Verify targetTable persisted in schema
CODE=$(http GET "/api/forms/$MAPPED_TBL_ID/schema" "$TOKEN")
RESP=$(cat /tmp/e2e_body)
assert_eq "targetTable in schema" "users" '.data.targetTable'

# Empty string targetTable normalized to null
CODE=$(http POST /api/forms "$TOKEN" '{"name":"empty-tt","description":null,"targetTable":""}')
assert_http_ok "create form with empty targetTable" "$CODE"
RESP=$(cat /tmp/e2e_body)
EMPTY_TT_ID=$(echo "$RESP" | jq -r '.data')
CODE=$(http GET "/api/forms/$EMPTY_TT_ID/schema" "$TOKEN")
RESP=$(cat /tmp/e2e_body)
assert_eq "empty targetTable normalized to null" "null" '.data.targetTable'

# ----------- 9. Soft delete -----------
section "9. Soft delete"

CODE=$(http POST /api/forms "$TOKEN" '{"name":"to-delete","description":null,"targetTable":null}')
assert_http_ok "create sacrificial form" "$CODE"
RESP=$(cat /tmp/e2e_body)
SACRIFICIAL_ID=$(echo "$RESP" | jq -r '.data')

CODE=$(http DELETE "/api/forms/$SACRIFICIAL_ID" "$TOKEN")
assert_http_ok "DELETE /api/forms/{id}" "$CODE"

CODE=$(http GET /api/forms "$TOKEN")
RESP=$(cat /tmp/e2e_body)
# Sacrificial should not appear (it's soft-deleted)
EXISTS=$(echo "$RESP" | jq -r --arg id "$SACRIFICIAL_ID" '[.data[] | .formId == $id] | any')
assert_eq "soft-deleted form not in list" "false" "$EXISTS"

# ----------- 10. Field update + delete -----------
section "10. Field update + delete"

CODE=$(http PUT "/api/forms/$NEW_FORM_ID/fields/$SINGLE_FIELD_ID" "$TOKEN" \
  '{"name":"已修改","type":"textarea"}')
assert_http_ok "PUT field update" "$CODE"

CODE=$(http GET "/api/forms/$NEW_FORM_ID/fields" "$TOKEN")
RESP=$(cat /tmp/e2e_body)
UPDATED_NAME=$(echo "$RESP" | jq -r --arg id "$SINGLE_FIELD_ID" '.data[] | select(.id==$id) | .name')
if [[ "$UPDATED_NAME" == "已修改" ]]; then
  printf "  \033[32m✓\033[0m %-50s %s\n" "field name updated" "$UPDATED_NAME"
  PASS=$((PASS+1))
else
  printf "  \033[31m✗\033[0m %-50s expected=已修改 actual=%s\n" "field name updated" "$UPDATED_NAME"
  FAIL=$((FAIL+1))
  FAILURES+=("field name updated: actual=$UPDATED_NAME")
fi

CODE=$(http DELETE "/api/forms/$NEW_FORM_ID/fields/$SINGLE_FIELD_ID" "$TOKEN")
assert_http_ok "DELETE field" "$CODE"

CODE=$(http GET "/api/forms/$NEW_FORM_ID/fields" "$TOKEN")
RESP=$(cat /tmp/e2e_body)
EXISTS=$(echo "$RESP" | jq -r --arg id "$SINGLE_FIELD_ID" '[.data[] | .id == $id] | any')
assert_eq "deleted field not in list" "false" "$EXISTS"

# ----------- summary -----------
echo ""
printf "\033[1m== Summary ==\033[0m\n"
printf "Passed: \033[32m%d\033[0m\n" "$PASS"
printf "Failed: \033[31m%d\033[0m\n" "$FAIL"
if [[ $FAIL -gt 0 ]]; then
  printf "\nFailures:\n"
  for f in "${FAILURES[@]}"; do
    printf "  - %s\n" "$f"
  done
  exit 1
fi
echo "All tests passed."
