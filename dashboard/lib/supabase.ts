import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// 서버 전용 Supabase 클라이언트. service_role 키를 쓰므로 API 라우트(서버)에서만 import한다.
// 클라이언트 번들에 새어 나가면 안 된다 — page.tsx 등에서 직접 import 금지(API 경유).
let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL / SUPABASE_SERVICE_KEY 환경변수가 설정되지 않았습니다 (.env.local 확인)."
    );
  }
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
