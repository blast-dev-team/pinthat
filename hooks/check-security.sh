#!/bin/bash
# 보안 검증 스크립트 (G-8 기반)

echo "  🔐 비밀키 노출 체크..."
SECRETS=$(grep -r "service_role\|secret_key\|api_key\|private_key\|sk_live\|sk_test" --include="*.html" --include="*.js" --include="*.ts" --include="*.tsx" --include="*.jsx" 2>/dev/null | grep -v node_modules | grep -v ".template")
if [ -n "$SECRETS" ]; then
  echo "  ❌ 비밀키 노출 발견!"
  echo "$SECRETS"
  exit 1
else
  echo "  ✅ 비밀키 노출 없음"
fi

echo "  🔐 데모/테스트 코드 체크..."
DEMO=$(grep -rn "DEMO\|TODO.*remove\|FIXME\|HACK" --include="*.html" --include="*.js" --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v node_modules | grep -v ".template")
if [ -n "$DEMO" ]; then
  echo "  ⚠️ 데모/임시 코드 발견 (WARN)"
  echo "$DEMO"
else
  echo "  ✅ 데모 코드 없음"
fi

exit 0
