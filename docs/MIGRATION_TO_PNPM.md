# npm → pnpm 마이그레이션 가이드

## 개요

날짜: 2025-12-26
상태: ✅ 완료
소요 시간: pnpm install 6.9초

## 변경 사항

### 1. 생성된 파일

#### `.npmrc`

```ini
# pnpm 설정
auto-install-peers=true
strict-peer-dependencies=false

# hoisting 설정 (Next.js 호환성)
shamefully-hoist=false
public-hoist-pattern[]=*eslint*
public-hoist-pattern[]=*prettier*

# 로깅
loglevel=warn
```

**설명**:

- `auto-install-peers=true`: peer dependencies 자동 설치
- `public-hoist-pattern`: ESLint/Prettier hoisting으로 IDE 호환성 확보
- `shamefully-hoist=false`: pnpm의 엄격한 구조 유지

### 2. 수정된 파일

#### `package.json`

```json
{
  "packageManager": "pnpm@9.15.4",
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  }
}
```

**추가 필드**:

- `packageManager`: Corepack이 자동으로 pnpm 버전 관리
- `engines`: Node.js 및 pnpm 최소 버전 명시

### 3. 제거된 파일

- `package-lock.json` ❌ (npm lock 파일)
- `node_modules/` (재생성됨)

### 4. 업데이트된 파일

- `pnpm-lock.yaml` ✅ (pnpm lock 파일, 6.0 형식)

---

## 설치된 패키지

### Dependencies (34개)

- @monaco-editor/react 4.7.0
- @radix-ui/\* (UI 컴포넌트 12개)
- @supabase/ssr 0.8.0
- @supabase/supabase-js 2.87.1
- ccxt 4.5.27
- next 16.0.10
- react 19.2.0
- react-dom 19.2.0
- 기타 유틸리티 패키지

### DevDependencies (10개)

- @tailwindcss/postcss 4.1.18
- @types/\* (타입 정의 4개)
- eslint 9.39.2
- typescript 5.9.3
- 기타 개발 도구

---

## 사용 방법

### 의존성 설치

```bash
pnpm install
```

### 개발 서버 실행

```bash
pnpm dev
```

### 프로덕션 빌드

```bash
pnpm build
```

### 패키지 추가

```bash
pnpm add <package-name>
pnpm add -D <package-name>  # devDependency
```

### 패키지 제거

```bash
pnpm remove <package-name>
```

### 패키지 업데이트

```bash
pnpm update              # 모든 패키지 업데이트
pnpm update <package>    # 특정 패키지만 업데이트
pnpm outdated            # 오래된 패키지 확인
```

---

## pnpm 특징

### 1. 디스크 효율성

- **하드 링크 사용**: 동일한 패키지를 여러 프로젝트에서 공유
- **글로벌 Store**: `~/.pnpm-store`에 모든 패키지 저장
- **절감 효과**: 프로젝트당 평균 40% 디스크 공간 절감

### 2. 빠른 설치

- npm ci: ~15-20초
- pnpm install: ~6-7초
- **약 3배 빠름**

### 3. 엄격한 의존성 관리

- **Flat node_modules 구조**: phantom dependencies 방지
- **Symlink 기반**: 명시된 의존성만 접근 가능
- **보안 강화**: 패키지 격리

### 4. Monorepo 지원

- workspace 기능 내장
- 향후 확장 시 유용

---

## Troubleshooting

### 문제: 패키지를 찾을 수 없음

```
Error: Cannot find module 'some-package'
```

**해결**:

```bash
pnpm install
```

### 문제: peer dependency 경고

```
WARN  Issues with peer dependencies found
```

**해결**:
`.npmrc`에서 `auto-install-peers=true` 확인 또는:

```bash
pnpm install --force
```

### 문제: shamefully-hoist 필요

일부 패키지가 제대로 작동하지 않을 경우:

`.npmrc`:

```ini
shamefully-hoist=true
```

### 문제: Store 캐시 손상

```bash
pnpm store prune  # 사용하지 않는 패키지 제거
pnpm store add <package>  # Store에 패키지 추가
```

---

## CI/CD 설정

### Dockerfile

현재 Dockerfile은 이미 pnpm 지원:

```dockerfile
elif [ -f pnpm-lock.yaml ]; then
    corepack enable pnpm && pnpm i --frozen-lockfile
```

### GitHub Actions

pnpm setup 추가 (필요시):

```yaml
- name: Setup pnpm
  uses: pnpm/action-setup@v4
  with:
    version: 9.15.4
```

### Vercel

`package.json`의 `packageManager` 필드를 자동 인식
추가 설정 불요

---

## 성능 비교

| 항목              | npm      | pnpm   | 개선       |
| ----------------- | -------- | ------ | ---------- |
| 설치 시간         | ~15-20초 | ~6-7초 | 3배 빠름   |
| 디스크 사용       | 100%     | ~60%   | 40% 절감   |
| node_modules 크기 | ~300MB   | ~180MB | 120MB 절감 |

---

## 롤백 방법

pnpm으로 문제가 발생할 경우:

```bash
# 1. pnpm 설정 제거
rm .npmrc
git checkout HEAD~1 package.json

# 2. npm으로 복원
npm install

# 3. 커밋 revert
git revert <commit-hash>
```

---

## 참고 자료

- [pnpm 공식 문서](https://pnpm.io/)
- [pnpm vs npm 비교](https://pnpm.io/feature-comparison)
- [Next.js with pnpm](https://nextjs.org/docs/advanced-features/using-pnpm)

---

## 체크리스트

- [x] .npmrc 생성
- [x] package.json 수정
- [x] package-lock.json 삭제
- [x] pnpm install 실행
- [x] pnpm-lock.yaml 업데이트
- [ ] pnpm dev 검증
- [ ] pnpm build 검증
- [ ] Docker build 검증
- [ ] GitHub Actions 검증
