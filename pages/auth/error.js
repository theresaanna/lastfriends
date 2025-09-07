import { useEffect } from 'react';
import { useRouter } from 'next/router';

// pages/auth/error.js
// Fallback page in case anything still links to /auth/error. It preserves the
// error query string and forwards to /auth/signin which handles messaging.
export default function AuthErrorFallback() {
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(router.asPath.split('?')[1] || '');
    const qs = params.toString();
    const target = qs ? `/auth/signin?${qs}` : '/auth/signin';
    router.replace(target);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow">
        <p className="text-gray-700">Redirecting…</p>
      </div>
    </div>
  );
}

