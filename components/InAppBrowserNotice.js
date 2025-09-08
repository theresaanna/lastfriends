import { useEffect, useState } from 'react';

function detectInAppBrowser() {
  if (typeof navigator === 'undefined') return false;
  const ua = (navigator.userAgent || navigator.vendor || '').toLowerCase();
  // Common in-app browser identifiers (not exhaustive)
  const patterns = [
    'instagram', 'fb_iab', 'fbav', 'fban', 'twitter', 'snapchat', 'line/', 'wechat', 'kakaotalk', 'pinterest', 'linkedin', 'discord',
    'wv; ', '; wv', ' webview', 'gsa', 'okhttp'
  ];
  return patterns.some(p => ua.includes(p));
}

export default function InAppBrowserNotice({ className = '' }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(detectInAppBrowser());
  }, []);

  if (!show) return null;

  const openInBrowser = () => {
    try {
      const url = window.location.href;
      // Best effort: open a new tab. Many in-app browsers hand off to default browser.
      window.open(url, '_blank', 'noopener');
    } catch (e) {}
  };

  return (
    <div className={`bg-yellow-50 border border-yellow-200 text-yellow-900 p-3 rounded-md ${className}`} role="alert" aria-live="polite">
      <div className="flex items-start justify-between space-x-3">
        <div className="flex-1">
          <p className="font-medium">You are using an in-app browser.</p>
          <p className="text-sm mt-1">For a secure login with Spotify, please open this page in your device's default browser (Safari or Chrome).</p>
        </div>
        <div className="flex-shrink-0">
          <button onClick={openInBrowser} className="bg-yellow-600 hover:bg-yellow-700 text-white text-sm px-3 py-2 rounded-md">Open in Browser</button>
        </div>
      </div>
      <p className="text-xs text-yellow-800 mt-2">Learn more on our <a href="/about-security" className="underline">Security page</a>.</p>
    </div>
  );
}
