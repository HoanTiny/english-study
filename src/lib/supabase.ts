"use client";

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Trình duyệt client dùng anon key (an toàn để lộ phía client).
// Session lưu trong localStorage, tự refresh token.
export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // Bật để hứng phiên đăng nhập trả về từ Google OAuth (redirect kèm token trên URL).
    detectSessionInUrl: true,
    flowType: "pkce",
  },
});
