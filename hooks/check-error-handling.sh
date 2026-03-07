#!/bin/bash
# 에러 핸들링 검증 스크립트 (3-gate 패턴)

echo "  🛡️ 빈 catch 블록 체크..."
EMPTY_CATCH=$(grep -A3 "catch" --include="*.js" --include="*.ts" --include="*.tsx" -r 2>/dev/null | grep -v node_modules | grep -v ".template" | grep "console.log\|console.error" | head -10)
if [ -n "$EMPTY_CATCH" ]; then
  echo "  ⚠️ catch 블록에서 console만 사용하는 코드 발견 (확인 필요)"
  echo "$EMPTY_CATCH"
else
  echo "  ✅ catch 블록 패턴 정상"
fi

echo "  🛡️ fetch 에러 처리 체크..."
FETCH_NO_CHECK=$(grep -A2 "await fetch\|\.fetch(" --include="*.js" --include="*.ts" --include="*.tsx" -r 2>/dev/null | grep -v node_modules | grep -v ".template" | grep -v "res.ok\|response.ok\|!res\|!response" | head -10)
if [ -n "$FETCH_NO_CHECK" ]; then
  echo "  ⚠️ fetch 후 응답 체크가 없는 코드 발견 (확인 필요)"
  echo "$FETCH_NO_CHECK"
else
  echo "  ✅ fetch 응답 체크 정상"
fi

exit 0
