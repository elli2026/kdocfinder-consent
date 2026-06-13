import { createClient } from '@supabase/supabase-js';

// 서버 전용 (service_role key 사용)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
);
