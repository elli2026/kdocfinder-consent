-- ============================================
-- K-DocFinder 인터뷰 동의서 테이블
-- Supabase SQL Editor에서 실행
-- ============================================

-- 1. 동의서 테이블 생성
CREATE TABLE IF NOT EXISTS consent_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  consent_id TEXT NOT NULL UNIQUE,        -- KDF-20260612-A3F2 형식
  name TEXT NOT NULL,
  nationality TEXT NOT NULL,
  email TEXT,                              -- 선택 항목
  is_adult BOOLEAN NOT NULL DEFAULT false,
  consent_content BOOLEAN NOT NULL DEFAULT false,
  consent_privacy BOOLEAN NOT NULL DEFAULT false,
  signature_data TEXT,                     -- base64 서명 이미지
  filming_date DATE DEFAULT CURRENT_DATE,  -- 촬영일
  filming_location TEXT,                   -- 촬영장소
  language TEXT DEFAULT 'kr',              -- 동의 언어
  ip_address TEXT,
  user_agent TEXT,
  email_sent BOOLEAN DEFAULT false,        -- 이메일 발송 여부
  email_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  withdrawn_at TIMESTAMPTZ,               -- 철회 시 기록
  expires_at TIMESTAMPTZ                  -- 동의 만료일 (5년)
);

-- 2. 인덱스
CREATE INDEX IF NOT EXISTS idx_consent_consent_id ON consent_records(consent_id);
CREATE INDEX IF NOT EXISTS idx_consent_email ON consent_records(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_consent_created ON consent_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_consent_filming_date ON consent_records(filming_date);

-- 3. 만료일 자동 설정 트리거
CREATE OR REPLACE FUNCTION set_consent_expiry()
RETURNS TRIGGER AS $$
BEGIN
  NEW.expires_at := NEW.created_at + INTERVAL '5 years';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_consent_expiry ON consent_records;
CREATE TRIGGER trigger_set_consent_expiry
  BEFORE INSERT ON consent_records
  FOR EACH ROW
  EXECUTE FUNCTION set_consent_expiry();

-- 4. RLS (Row Level Security)
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;

-- 관리자만 조회 가능 (service_role key 사용)
CREATE POLICY "Service role full access" ON consent_records
  FOR ALL USING (auth.role() = 'service_role');

-- anon key로는 INSERT만 허용 (폼 제출용)
CREATE POLICY "Anon can insert" ON consent_records
  FOR INSERT WITH CHECK (true);

-- 5. 뷰: 활성 동의서 목록 (관리용)
CREATE OR REPLACE VIEW active_consents AS
SELECT 
  consent_id,
  name,
  nationality,
  email,
  filming_date,
  filming_location,
  language,
  created_at,
  expires_at,
  CASE 
    WHEN withdrawn_at IS NOT NULL THEN '철회'
    WHEN expires_at < NOW() THEN '만료'
    ELSE '유효'
  END AS status
FROM consent_records
ORDER BY created_at DESC;
