// components/SiteFooter.js - Global site footer with links
import Link from 'next/link';

export default function SiteFooter() {
  return (
    <footer className="mt-16 text-center py-8 border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-sm text-red-800">
          Made by <a href="https://last.fm/user/superexciting" className="hover:underline">Theresa</a> on <a href="https://threads.com/@hellyeahitstheresa" className="hover:underline">Threads</a>.
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Open Source on <a href="https://github.com/theresaanna/lastfriends" className="hover:underline">Github: theresaanna/lastfriends</a>
        </p>
          <p className="text-sm text-green-500 mt-1">
          Hire me, please: <a href="https://theresasumma.com" className="hover:underline">theresasumma.com</a>
        </p>
        <p className="text-xs text-gray-400 mt-2 space-x-3">
          <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
          <span className="text-gray-300">|</span>
          <Link href="/about-security" className="hover:underline">About Security</Link>
        </p>
      </div>
    </footer>
  );
}

