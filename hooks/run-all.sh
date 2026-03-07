#!/bin/bash
# ================================================
# 프로젝트 전체 검증 스크립트
# 사용: bash hooks/run-all.sh
# ================================================

echo "🔍 전체 검증 시작..."
echo "================================"

ERRORS=0
WARNS=0

# 보안 체크
echo ""
echo "📌 [1/3] 보안 체크"
bash hooks/check-security.sh
if [ $? -ne 0 ]; then ERRORS=$((ERRORS+1)); fi

# 에러 핸들링 체크
echo ""
echo "📌 [2/3] 에러 핸들링 체크"
bash hooks/check-error-handling.sh
if [ $? -ne 0 ]; then ERRORS=$((ERRORS+1)); fi

# 구조 체크 (프로젝트에 맞게 추가)
echo ""
echo "📌 [3/3] 구조 체크"
echo "  (프로젝트에 맞게 커스터마이징 필요)"

echo ""
echo "================================"
echo "검증 완료: ❌ $ERRORS개 에러"
if [ $ERRORS -gt 0 ]; then
  echo "⛔ 에러가 있습니다. 수정 후 다시 실행하세요."
  exit 1
else
  echo "✅ 전체 통과!"
  exit 0
fi
