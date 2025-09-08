import Layout from '../components/Layout';
import InAppBrowserNotice from '../components/InAppBrowserNotice';

export default function AboutSecurityPage() {
  return (
    <Layout>
      <div className="max-w-3xl mx-auto py-10 px-4">
        <h1 className="text-3xl font-bold mb-4">Security and HTTPS</h1>
        <InAppBrowserNotice className="mb-4" />
        <p className="mb-4">LastFriends uses HTTPS everywhere and enforces it with HSTS (HTTP Strict Transport Security). This means modern browsers will only connect to our site securely and will automatically upgrade any insecure requests.</p>
        <h2 className="text-2xl font-semibold mt-6 mb-2">Why you might see warnings</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>Some in-app browsers (e.g., Instagram, Twitter) restrict cookies or downgrade security, which can cause sign-in issues.</li>
          <li>If you previously visited an http:// link, your ISP/router may have intercepted it before the secure connection was established.</li>
        </ul>
        <h2 className="text-2xl font-semibold mt-6 mb-2">Recommended steps</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li>Open this site directly in Safari (iOS) or Chrome (Android).</li>
          <li>Always use the canonical URL: <code>https://lastfriends.site</code>.</li>
          <li>If you see a warning in an app, tap the ••• menu and choose "Open in Browser".</li>
        </ol>
        <h2 className="text-2xl font-semibold mt-6 mb-2">Technical details</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>HSTS header: <code>Strict-Transport-Security: max-age=63072000; includeSubDomains; preload</code></li>
          <li>Content Security Policy: <code>upgrade-insecure-requests</code> to avoid mixed content.</li>
          <li>OAuth cookies are scoped to the apex domain <code>lastfriends.site</code> to avoid state loss across subdomains.</li>
        </ul>
        <p className="mt-6 text-sm text-gray-600">Questions? Open an issue on <a href="https://github.com/theresaanna/lastfriends" className="underline">GitHub</a>.</p>
      </div>
    </Layout>
  );
}
