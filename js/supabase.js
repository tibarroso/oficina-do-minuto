import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// URL do seu projeto Supabase
const SUPABASE_URL = "https://otplwkqekzihwvjwdezz.supabase.co";

// Chave pública ANON (para uso seguro no front-end)
// ⚠️ Nunca use a chave `service_role` no front-end
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90cGx3a3Fla3ppaHd2andkZXp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MDE5NTUsImV4cCI6MjA4NTA3Nzk1NX0.XymAmVbOUtLwOuXbHkHM3GaDNyE_6mDa8UW4DE1mQbw";

// Cria cliente Supabase para front-end
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
