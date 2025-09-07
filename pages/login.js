import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function Login() {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      router.push('/');
    }
  }, [session, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold mb-4">Welcome to LastFriends</h1>
        <button
          onClick={async () => {
            try {
              const res = await fetch('/api/debug/canonical', { credentials: 'include', cache: 'no-store' });
              const data = await res.json();
              if (data?.mismatch && data?.nextAuthUrl) {
                console.warn('[HostCheck] Mismatch detected; redirecting to canonical origin before sign-in', data);
                const canonical = new URL(data.nextAuthUrl);
                const current = new URL(window.location.href);
                current.protocol = canonical.protocol;
                current.host = canonical.host;
                window.location.replace(current.toString());
                return;
              }
            } catch (e) {
              console.warn('[HostCheck] Pre sign-in check failed', e?.message);
            }
            signIn('spotify');
          }}
          className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600"
        >
          Connect with Spotify
        </button>
      </div>
    </div>
  );
}