import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anonKey) {
  throw new Error('Supabase env vars missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const STORAGE_BUCKETS = {
  avatars: 'avatars',
  covers: 'covers',
  posts: 'posts',
  stories: 'stories',
  reels: 'reels',
  messages: 'messages',
} as const;

export async function uploadFile(
  bucket: keyof typeof STORAGE_BUCKETS,
  file: File | Blob,
  path?: string,
): Promise<string> {
  const ext = (file as File).name?.split('.').pop() || 'bin';
  const fileName = path || `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(STORAGE_BUCKETS[bucket])
    .upload(fileName, file, { upsert: false, cacheControl: '3600' });
  if (error) throw error;
  const { data } = supabase.storage.from(STORAGE_BUCKETS[bucket]).getPublicUrl(fileName);
  return data.publicUrl;
}
