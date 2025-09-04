// pages/index.js
import { useState } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const [user1, setUser1] = useState('');
  const [user2, setUser2] = useState('');
  const [period, setPeriod] = useState('overall');
  const [error, setError] = useState('');
  const router = useRouter();

  console.log('Fresh home component loaded!');

  const handleCompare = () => {
    alert('Button clicked!'); // Simple test

    console.log('=== COMPARE BUTTON CLICKED ===');
    console.log('user1:', user1);
    console.log('user2:', user2);
    console.log('period:', period);

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
    console.log('Navigating to URL:', url);

    router.push(url);
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <h1>Last.fm Music Compatibility Analyzer</h1>
      <p>Compare the music tastes of two Last.fm users and discover your compatibility!</p>

      <div>
        <div style={{ marginBottom: '20px' }}>
          <label htmlFor="user1" style={{ display: 'block', marginBottom: '5px' }}>
            First Last.fm Username:
          </label>
          <input
            id="user1"
            type="text"
            value={user1}
            onChange={(e) => setUser1(e.target.value)}
            placeholder="Enter username..."
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label htmlFor="user2" style={{ display: 'block', marginBottom: '5px' }}>
            Second Last.fm Username:
          </label>
          <input
            id="user2"
            type="text"
            value={user2}
            onChange={(e) => setUser2(e.target.value)}
            placeholder="Enter username..."
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label htmlFor="period" style={{ display: 'block', marginBottom: '5px' }}>
            Time Period:
          </label>
          <select
            id="period"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
          >
            <option value="overall">All Time</option>
            <option value="7day">Last 7 Days</option>
            <option value="1month">Last Month</option>
            <option value="3month">Last 3 Months</option>
            <option value="6month">Last 6 Months</option>
            <option value="12month">Last Year</option>
          </select>
        </div>

        {error && (
          <div style={{
            color: 'red',
            marginBottom: '20px',
            padding: '10px',
            border: '1px solid red',
            borderRadius: '4px',
            backgroundColor: '#ffe6e6'
          }}>
            {error}
          </div>
        )}

        <button
          onClick={handleCompare}
          style={{
            width: '100%',
            padding: '15px',
            backgroundColor: '#d92323',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            cursor: 'pointer'
          }}
        >
          Compare Music Taste
        </button>
      </div>

      <div style={{ marginTop: '40px', fontSize: '14px', color: '#666' }}>
        <p><strong>Note:</strong> Both users must have public Last.fm profiles for this to work.</p>
        <p>This tool analyzes your top artists and tracks to find compatibility and shared favorites.</p>
      </div>
    </div>
  );
}