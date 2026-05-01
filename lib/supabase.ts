import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

export async function ensureSession() {
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session;
  const { data: anon, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return anon.session;
}

export type Stroke = {
  color: string;
  width: number;
  tool: 'pen' | 'highlighter';
  points: { x: number; y: number }[];
};

export type Sketch = {
  id: string;
  user_id: string;
  title: string;
  strokes: Stroke[];
  mode: 'fullscreen' | 'floating';
  opacity: number;
  background: string;
  created_at: string;
  updated_at: string;
};
