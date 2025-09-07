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
        <p className="text-xs text-gray-400 mt-2">
          <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
        </p>
      </div>
    </footer>
  );
}

