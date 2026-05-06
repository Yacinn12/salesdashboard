import { createClient } from "@supabase/supabase-js";

const URL = process.env.REACT_APP_SUPABASE_URL;
const KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(URL, KEY);

// Separate client for user-creation actions (no session persistence = doesn't override current session)
export const supabaseNoSession = createClient(URL, KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
