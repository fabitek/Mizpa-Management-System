import { LoginForm } from '../../components/auth/LoginForm.tsx';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-zinc-950 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <LoginForm />
    </main>
  );
}
