# 보안 검증 체크리스트

> G-8 (보안 검증 규칙) + G-9 (결제 체크리스트) 기반

## 기본 보안 (모든 프로젝트)

### API 키 / 비밀키
```
grep -r "service_role|secret_key|api_key|private_key" --include="*.html" --include="*.js" --include="*.ts" --include="*.tsx"
→ 결과가 0건이어야 함
```

### 에러 핸들링
```
grep -rn "catch" --include="*.js" --include="*.ts" --include="*.tsx"
→ 각 catch 블록이 에러 처리 로직을 포함하는지 확인
→ console.log만 있고 return/throw 없는 catch = 🔴
```

### 인증/권한
```
grep -rn "user_id|userId" --include="*.js" --include="*.ts"
→ 서버에서 현재 사용자 검증 없이 파라미터만 신뢰하는 코드 = 🔴
```

## 결제 보안 (결제 기능 있는 프로젝트만)

```
grep -r "amount|price" --include="*.html" --include="*.js" --include="*.ts"
→ 프론트에서 금액을 서버로 전달하는 코드 = 🔴
```

```
grep -r "hidden.*price|hidden.*amount" --include="*.html"
→ hidden input에 금액 = 🔴
```

## 검사 결과 기록

| 날짜 | 검사자 | 결과 | 비고 |
|------|--------|------|------|
| | | | |
