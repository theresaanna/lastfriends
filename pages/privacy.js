// pages/privacy.js - Privacy Policy scaffold
import Layout from '../components/Layout';

export default function PrivacyPage() {
  return (
    <Layout>
      <div className="max-w-3xl mx-auto bg-white/80 backdrop-blur-sm shadow-sm rounded-2xl p-6 md:p-8 border border-gray-100">
        <header className="mb-6">
          <h1 className="text-3xl font-extrabold gradient-text">Privacy Policy</h1>
          <p className="text-gray-600 mt-1">How LastFriends handles your data and cookies</p>
        </header>
        <div className="prose prose-sm sm:prose lg:prose lg:prose-indigo space-y-6">
          <p className="my-4">LastFriends respects your privacy. This document explains what information we collect, how we use it, and the choices you have.</p>
          <p className="my-4">We take your data security seriously and take all industry-standard precautions with it.</p>

          <h2 className="text-green-600 mt-8">What this app does</h2>
          <p>LastFriends compares listening data from Last.fm and Spotify to show you cross-platform compatibility. We do not sell personal data.</p>

          <h2 className="text-green-600 mt-8">Information we process</h2>
          <ul className="my-5 list-disc pl-6">
            <li><strong>Last.fm usernames</strong> that you enter to run comparisons.</li>
            <li><strong>Spotify account basic profile</strong> (id, display name, country, follower count, avatar) when you connect Spotify.</li>
            <li><strong>Listening summaries</strong> (top artists/tracks/genres) fetched from the respective APIs.</li>
          </ul>

          <h2 className="text-green-600 mt-8">Authentication and session</h2>
          <p>If you sign in with Spotify, we store a short‑lived, <em>essential</em> session cookie so the app can make API requests on your behalf. This cookie is not used for advertising and is required for the service to function.</p>

          <h2 className="text-green-600 mt-8">Cookies</h2>
          <ul className="my-5 list-disc pl-6">
            <li><strong>Essential</strong>: session cookie for authentication (required).</li>
            <li><strong>Non‑essential</strong>: none by default. If analytics or marketing cookies are added in the future, we will update this page and request consent where applicable.</li>
          </ul>

          <h2 className="text-green-600 mt-8">Data retention</h2>
          <p>We do not permanently store comparison results. Cached results may be kept temporarily to improve performance and are automatically expired.</p>

          <h2 className="text-green-600 mt-8">Third‑party services</h2>
          <ul className="my-5 list-disc pl-6">
            <li><strong>Last.fm</strong>: we call the public API using the usernames you provide.</li>
            <li><strong>Spotify</strong>: we use the Spotify Web API per the scopes you consent to (e.g., user‑top‑read). You can revoke access at any time from your Spotify account settings.</li>
          </ul>

          <h2 className="text-green-600 mt-8">Your choices</h2>
          <ul className="my-5 list-disc pl-6">
            <li>You can disconnect Spotify at any time.</li>
            <li>You can choose not to provide any Last.fm username.</li>
            <li>If analytics are added later, you’ll be able to opt in/out.</li>
          </ul>

          <h2 className="text-green-600 mt-8">Contact</h2>
          <p className="my-4">Questions? Reach out via <a href="https://github.com/theresaanna/lastfriends" target="_blank" rel="noopener noreferrer">GitHub</a> or <a href="https://last.fm/user/superexciting" target="_blank" rel="noopener noreferrer">Last.fm</a>.</p>

          <p className="text-xs text-gray-500 mt-6">Last updated: {new Date().toISOString().slice(0, 10)}</p>
        </div>
      </div>
    </Layout>
  );
}

