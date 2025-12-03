# OAuth 2.0 설정 가이드

## Google OAuth 설정

### 1. Google Cloud Console 설정
1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 생성 또는 선택
3. **APIs & Services** → **Credentials** 메뉴로 이동
4. **+ CREATE CREDENTIALS** → **OAuth client ID** 클릭
5. Application type: **Web application** 선택
6. Name: `QUANT.LIVE` (원하는 이름)
7. **Authorized redirect URIs** 추가:
   ```
   https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback
   ```
   (Supabase 대시보드 → Authentication → Providers → Google에서 확인 가능)

8. **CREATE** 클릭
9. **Client ID**와 **Client Secret** 복사

### 2. Supabase에 Google OAuth 연동
1. Supabase 대시보드 → **Authentication** → **Providers**
2. **Google** 클릭하여 활성화
3. 위에서 복사한 **Client ID**와 **Client Secret** 입력
4. **Save** 클릭

---

## Naver OAuth 설정

### 1. Naver Developers 설정
1. [Naver Developers](https://developers.naver.com/apps/#/register) 접속
2. **애플리케이션 등록** 클릭
3. 애플리케이션 이름: `QUANT.LIVE`
4. 사용 API: **네이버 로그인** 선택
5. **제공 정보 선택**: 이메일, 이름
6. **서비스 환경**: PC 웹
7. **서비스 URL**: `http://localhost:3000` (개발), `https://yourdomain.com` (배포)
8. **Callback URL**: 
   ```
   https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback
   ```
9. 등록 완료 후 **Client ID**와 **Client Secret** 복사

### 2. Supabase Custom Provider 설정
Supabase는 기본적으로 Naver를 지원하지 않으므로, 커스텀 설정이 필요합니다.
(추후 구현 예정)

---

## Kakao OAuth 설정

### 1. Kakao Developers 설정
1. [Kakao Developers](https://developers.kakao.com/) 접속
2. **내 애플리케이션** → **애플리케이션 추가하기**
3. 앱 이름: `QUANT.LIVE`
4. **앱 설정** → **플랫폼** → **Web 플랫폼 등록**
   - 사이트 도메인: `http://localhost:3000`, `https://yourdomain.com`
5. **제품 설정** → **카카오 로그인** 활성화
6. **Redirect URI** 등록:
   ```
   https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback
   ```
7. **동의항목** 설정: 이메일, 닉네임
8. **앱 키** → **REST API 키** 복사

### 2. Supabase Custom Provider 설정
Supabase는 기본적으로 Kakao를 지원하지 않으므로, 커스텀 설정이 필요합니다.
(추후 구현 예정)

---

## 현재 상태
- ✅ Google OAuth: Supabase 기본 지원 (설정만 하면 바로 사용 가능)
- ⏳ Naver OAuth: 커스텀 구현 필요
- ⏳ Kakao OAuth: 커스텀 구현 필요
