# K-DocFinder 인터뷰 동의서 시스템

## 프로젝트 구조
```
kdocfinder-consent/
├── app/
│   ├── api/consent/route.ts   ← API (Supabase 저장 + Resend 이메일)
│   ├── layout.tsx
│   └── page.tsx               ← / 접속 시 consent.html로 리다이렉트
├── lib/
│   └── supabase.ts            ← Supabase 클라이언트
├── public/
│   ├── consent.html           ← 동의 폼 (5개국어)
│   ├── qr.png                 ← QR 코드 (인쇄용)
│   └── qr.svg                 ← QR 코드 (벡터)
├── .env.local.example         ← 환경변수 템플릿
└── consent-migration.sql      ← Supabase 테이블 생성 SQL
```

## 세팅 순서

### 1. 환경변수 설정
```bash
cp .env.local.example .env.local
# .env.local 열어서 실제 키 입력
```

### 2. 설치 및 실행
```bash
npm install
npm run dev
```

### 3. 테스트
- http://localhost:3000/consent.html 접속
- 폼 작성 → 제출 → Supabase 확인 → 이메일 확인

### 4. 배포
```bash
# Vercel 배포
vercel
```

## QR 코드
- `https://www.kdocfinder.com/consent.html` 로 연결
- 촬영 당일: `https://www.kdocfinder.com/consent.html?date=2026-06-15&location=홍대`
