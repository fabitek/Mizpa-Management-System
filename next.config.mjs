/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://ntjcedrmvftoexcicsfb.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_0iN4YOWw-WSdl6TF3fna3g_1tqgtLL0',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_0iN4YOWw-WSdl6TF3fna3g_1tqgtLL0',
    DATA_SOURCE: 'supabase',
  },
};

export default nextConfig;
