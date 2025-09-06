// pages/index.js
import { useState } from 'react';
import { useRouter } from 'next/router';
import { Analytics } from "@vercel/analytics/next"
import Layout from '../components/Layout';

export default function Home() {
  const [user1, setUser1] = useState('');
  const [user2, setUser2] = useState('');
  const [period, setPeriod] = useState('overall');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleCompare = () => {
    setError('');

    if (!user1.trim() || !user2.trim()) {
      setError('Please enter both usernames');
      return;
    }

    if (user1.toLowerCase() === user2.toLowerCase()) {
      setError('Please enter two different usernames');
      return;
    }

    const url = `/compare?user1=${encodeURIComponent(user1.trim())}&user2=${encodeURIComponent(user2.trim())}&period=${period}`;
    router.push(url);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleCompare();
    }
  };

  return (
    <Layout>
      <Analytics />
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          {/* Header */}
          <div className="text-center mb-8 fade-in-up">
            <div className="mb-4">
              <h1 className="text-4xl font-bold gradient-text mb-2">
                Last.fm Music Matcher
              </h1>
              <div className="w-20 h-1 bg-gradient-lastfm mx-auto rounded-full"></div>
            </div>
            <p className="text-gray-600 text-lg">
              Compare music tastes and discover your compatibility!
            </p>
          </div>

          {/* Form Card */}
          <div className="card-elevated p-8 fade-in-up">
            <div className="space-y-6">
              {/* User 1 Input */}
              <div>
                <label htmlFor="user1" className="block text-sm font-semibold text-gray-700 mb-2">
                  First Last.fm Username
                </label>
                <input
                  id="user1"
                  type="text"
                  value={user1}
                  onChange={(e) => setUser1(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter username..."
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  className="input-field"
                />
              </div>

              {/* User 2 Input */}
              <div>
                <label htmlFor="user2" className="block text-sm font-semibold text-gray-700 mb-2">
                  Second Last.fm Username
                </label>
                <input
                  id="user2"
                  type="text"
                  value={user2}
                  onChange={(e) => setUser2(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter username..."
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  className="input-field"
                />
              </div>

              {/* Period Select */}
              <div>
                <label htmlFor="period" className="block text-sm font-semibold text-gray-700 mb-2">
                  Time Period
                </label>
                <select
                  id="period"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="select-field"
                >
                  <option value="overall">All Time</option>
                  <option value="7day">Last 7 Days</option>
                  <option value="1month">Last Month</option>
                  <option value="3month">Last 3 Months</option>
                  <option value="6month">Last 6 Months</option>
                  <option value="12month">Last Year</option>
                </select>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 fade-in-up">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-800 font-medium">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={handleCompare}
                className="btn-lastfm w-full text-lg py-4"
              >
                Compare Music Taste
              </button>
            </div>
          </div>

          {/* Footer Info */}
          <div className="mt-8 text-center space-y-2 fade-in-up">
            <p className="text-sm text-gray-500">
              <strong>Note:</strong> Both users must have public Last.fm profiles
            </p>
              <p className="text-xs text-gray-400">
              Analyzes top artists and tracks to find compatibility and shared favorites
            </p>
              <p className="text-sm text-red-800">
                  Made by <a href="https://last.fm/user/superexciting">Theresa</a>.
              </p>
              <p className="text-sm text-gray-500">
                  Open Source on <a href="https://github.com/theresaanna/lastfriends">Github: theresaanna/lastfriends</a>
              </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}