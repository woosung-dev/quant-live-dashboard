# Docker CI 제거 결정

## 📋 개요

날짜: 2025-12-26  
결정: GitHub Actions의 Docker Image CI 워크플로우 제거

---

## ❌ 제거 이유

### 1. Vercel 배포 사용

- 프로젝트는 **Vercel**을 통해 배포됨
- Vercel이 자체적으로 빌드 및 배포 수행
- Docker 이미지가 실제 배포에 사용되지 않음

### 2. 보안 문제

Docker 빌드 시 환경 변수 문제:

```
Error: Supabase URL and Key must be defined in environment variables
Error: SERVER_ENCRYPTION_KEY is not set
```

**해결 시도한 방법들 (모두 부적절):**

- ❌ Dockerfile에 stub 환경 변수 하드코딩 → 보안 위험
- ❌ 빌드 타임에 fallback 키 사용 → 여전히 위험
- ❌ 환경 변수 체크 비활성화 → 런타임 보안 약화

**결론**: 환경 변수를 안전하게 처리하면서 Docker 빌드를 성공시키는 것이 복잡하고 위험함

### 3. CI/CD 간소화

- Docker CI가 실제 배포에 영향 없음
- 불필요한 빌드 시간 소모
- 유지보수 부담

---

## ✅ 대안: Vercel 배포

### Vercel의 장점

1. **환경 변수 안전 관리**

   - Vercel Dashboard에서 안전하게 관리
   - 빌드 시 자동 주입
   - 런타임에 안전하게 사용

2. **자동 빌드 및 배포**

   - Git push → 자동 빌드 → 자동 배포
   - Preview 배포 (PR마다)
   - Production 배포 (main 브랜치)

3. **최적화된 Next.js 지원**
   - Next.js 전용 최적화
   - Edge Functions
   - ISR (Incremental Static Regeneration)

---

## 🏗️ 배포 전략

### 개발 → 프로덕션 Flow

```
1. 로컬 개발
   ├─ pnpm dev
   └─ pnpm build (로컬 테스트)

2. GitHub Push
   └─ main 브랜치로 푸시

3. Vercel 자동 배포
   ├─ 환경 변수 자동 주입
   ├─ pnpm install
   ├─ pnpm build
   └─ 배포 완료
```

### 환경 변수 설정

Vercel Dashboard에서 설정:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SERVER_ENCRYPTION_KEY`
- 기타 필요한 환경 변수

---

## 📁 제거된 파일

- `.github/workflows/docker-image.yml`

---

## 🔄 Docker가 필요한 경우

향후 Docker 배포가 필요한 경우:

### 1. 로컬 Docker 빌드

```bash
# 환경 변수를 파일로 관리
cp .env.example .env.local
# .env.local에 실제 값 입력

# Docker 빌드 시 환경 변수 전달
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL} \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY} \
  -t quant-dashboard .
```

### 2. Dockerfile 수정

```dockerfile
# Build args
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY

# 환경 변수 설정
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
```

**주의**: 민감한 키는 절대 Dockerfile에 하드코딩하지 말 것

---

## 📝 결론

- ✅ Vercel 배포로 충분
- ✅ 보안 위험 제거
- ✅ CI/CD 간소화
- ✅ 유지보수 부담 감소

Docker는 필요시에만 로컬에서 사용하며, CI/CD는 Vercel에 위임
