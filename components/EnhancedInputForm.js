// components/EnhancedInputForm.js - Refactored for mixed comparisons
import { useState, useEffect, useRef } from 'react';
import { signIn, useSession } from 'next-auth/react';

const EnhancedInputForm = ({ onSubmit, onPreviewUser }) => {
  const { data: session, status: sessionStatus } = useSession();
  
  const [formData, setFormData] = useState({
    user1: '',
    user2: '',
    user1Service: 'lastfm',
    user2Service: 'lastfm',
    period: '3month',
    limit: '200'
  });

  const [validationStates, setValidationStates] = useState({
    user1: { status: 'idle', message: '', profile: null },
    user2: { status: 'idle', message: '', profile: null }
  });

  const [spotifyAuthStatus, setSpotifyAuthStatus] = useState('checking');
  const [spotifyUserInfo, setSpotifyUserInfo] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const retryScheduledRef = useRef(false);

  // Use NextAuth session for immediate auth status
  useEffect(() => {
    console.log('Session status changed:', sessionStatus, session?.user);
    
    if (sessionStatus === 'authenticated' && session) {
      console.log('User is authenticated with Spotify');
      setSpotifyAuthStatus('authenticated');
      setSpotifyUserInfo({
        displayName: session.user?.name || 'Spotify User',
        email: session.user?.email,
        images: session.user?.image ? [{ url: session.user.image }] : [],
        authenticated: true,
        dataSource: 'spotify',
        username: session.user?.email || session.user?.name || 'spotify_user'
      });
    } else if (sessionStatus === 'unauthenticated') {
      console.log('User is not authenticated');
      setSpotifyAuthStatus('not_authenticated');
      setSpotifyUserInfo(null);
    } else if (sessionStatus === 'loading') {
      console.log('Session is loading...');
      setSpotifyAuthStatus('checking');
    }
  }, [session, sessionStatus]);
  
  // Try to get additional data from secure session if available
  useEffect(() => {
    if (sessionStatus === 'authenticated' && session) {
      // Only try to get additional data, don't change auth status
      checkSpotifyAuth(false, true);
    }

    const handler = () => {
      console.log('Spotify auth ready event received');
      if (sessionStatus === 'authenticated') {
        checkSpotifyAuth(false, true);
      }
    };
    window.addEventListener('spotify-auth-ready', handler);
    
    return () => {
      window.removeEventListener('spotify-auth-ready', handler);
    };
  }, [sessionStatus, session]);

  const checkSpotifyAuth = async (withRetry = true, onlyUpdateData = false) => {
    try {
      console.log('Checking secure session for additional data...');
      const response = await fetch('/api/auth/me', { 
        credentials: 'include', 
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        }
      });
      const data = await response.json();
      console.log('Secure session response:', data);

      if (data.authenticated && data.dataSource === 'spotify') {
        console.log('Got additional Spotify data:', data.displayName || data.username);
        // Only update the user info with additional data, don't change auth status
        if (onlyUpdateData && spotifyAuthStatus === 'authenticated') {
          setSpotifyUserInfo(prev => ({
            ...prev,
            ...data,
            images: data.images || prev?.images || []
          }));
        } else if (!onlyUpdateData) {
          // This path shouldn't be used anymore, but keep for backward compatibility
          setSpotifyAuthStatus('authenticated');
          setSpotifyUserInfo(data);
        }
      } else if (!onlyUpdateData) {
        console.log('Secure session not available yet');
        // Don't change auth status if we're only updating data
        if (withRetry && !retryScheduledRef.current) {
          retryScheduledRef.current = true;
          setTimeout(() => {
            console.log('Retrying secure session check...');
            checkSpotifyAuth(false, onlyUpdateData);
          }, 800);
        }
      }
    } catch (error) {
      console.error('Secure session check failed:', error);
      // Don't change auth status on error if we're only updating data
    }
  };

  const initiateSpotifyLogin = async () => {
    try {
      // Use NextAuth to sign in with Spotify; the AuthHeader will bridge a secure session
      await signIn('spotify', {
        callbackUrl: '/?login=success&source=spotify'
      });
    } catch (error) {
      console.error('Failed to start Spotify authentication:', error);
    }
  };

  // Validation for Last.fm users
  const validateLastFmUser = async (username, userKey) => {
    if (!username.trim()) {
      setValidationStates(prev => ({
        ...prev,
        [userKey]: { status: 'idle', message: '', profile: null }
      }));
      return;
    }

    setValidationStates(prev => ({
      ...prev,
      [userKey]: { status: 'loading', message: 'Checking Last.fm profile...', profile: null }
    }));

    try {
      const API_KEY = process.env.NEXT_PUBLIC_LASTFM_API_KEY;
      const response = await fetch(`https://ws.audioscrobbler.com/2.0/?method=user.getinfo&user=${username}&api_key=${API_KEY}&format=json`);

      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          const profile = {
            name: data.user.name,
            realname: data.user.realname,
            playcount: data.user.playcount,
            image: data.user.image?.[2]?.['#text'] || '',
            country: data.user.country,
            registered: data.user.registered?.unixtime,
            service: 'lastfm'
          };

          setValidationStates(prev => ({
            ...prev,
            [userKey]: {
              status: 'success',
              message: 'Last.fm profile found!',
              profile
            }
          }));
        } else {
          throw new Error('User not found');
        }
      } else {
        throw new Error('User not found');
      }
    } catch (error) {
      setValidationStates(prev => ({
        ...prev,
        [userKey]: {
          status: 'error',
          message: 'Last.fm profile not found or private',
          profile: null
        }
      }));
    }
  };

  // Debounced validation for Last.fm users
  useEffect(() => {
    if (formData.user1Service === 'lastfm') {
      const timer = setTimeout(() => {
        if (formData.user1) validateLastFmUser(formData.user1, 'user1');
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [formData.user1, formData.user1Service]);

  useEffect(() => {
    if (formData.user2Service === 'lastfm') {
      const timer = setTimeout(() => {
        if (formData.user2) validateLastFmUser(formData.user2, 'user2');
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [formData.user2, formData.user2Service]);

  const handleInputChange = (field, value) => {
    // Build next form data with single state update
    setFormData(prev => {
      const next = { ...prev, [field]: value };

      // Enforce single-Spotify selection: if one side selects Spotify, the other is forced to Last.fm
      if (field === 'user1Service' && value === 'spotify' && prev.user2Service === 'spotify') {
        next.user2Service = 'lastfm';
        next.user2 = '';
      }
      if (field === 'user2Service' && value === 'spotify' && prev.user1Service === 'spotify') {
        next.user1Service = 'lastfm';
        next.user1 = '';
      }
      return next;
    });

    // Reset validation when service changes
    if (field === 'user1Service') {
      setValidationStates(prev => ({
        ...prev,
        user1: { status: 'idle', message: '', profile: null }
      }));
    }

    if (field === 'user2Service') {
      setValidationStates(prev => ({
        ...prev,
        user2: { status: 'idle', message: '', profile: null }
      }));
    }

    // Reset validation when username changes
    if (field === 'user1' || field === 'user2') {
      setValidationStates(prev => ({
        ...prev,
        [field]: { status: 'idle', message: '', profile: null }
      }));
    }
  };

  const handleSubmit = async () => {
    console.log('Submit clicked with:', {
      formData,
      spotifyAuthStatus,
      sessionStatus,
      spotifyUserInfo,
      validationStates
    });
    
    // Validate inputs based on service types
    let canSubmit = true;
    let validationErrors = [];

    // Check User 1
    if (formData.user1Service === 'lastfm') {
      const isValid = validationStates.user1.status === 'success';
      canSubmit = canSubmit && isValid;
      if (!isValid) validationErrors.push('User 1 Last.fm validation failed');
    } else if (formData.user1Service === 'spotify') {
      // Use sessionStatus instead of spotifyAuthStatus for more reliable check
      const isValid = sessionStatus === 'authenticated' && session;
      canSubmit = canSubmit && isValid;
      if (!isValid) validationErrors.push(`User 1 Spotify not authenticated (status: ${sessionStatus})`);
    }

    // Check User 2
    if (formData.user2Service === 'lastfm') {
      const isValid = validationStates.user2.status === 'success';
      canSubmit = canSubmit && isValid;
      if (!isValid) validationErrors.push('User 2 Last.fm validation failed');
    } else if (formData.user2Service === 'spotify') {
      // Use sessionStatus instead of spotifyAuthStatus for more reliable check
      const isValid = sessionStatus === 'authenticated' && session;
      canSubmit = canSubmit && isValid;
      if (!isValid) validationErrors.push(`User 2 Spotify not authenticated (status: ${sessionStatus})`);
    }

    console.log('Validation result:', { canSubmit, validationErrors });

    if (!canSubmit) {
      console.error('Cannot submit form:', validationErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      // Prepare submission data - use session email/name for Spotify users
      const spotifyUsername = session?.user?.email || session?.user?.name || spotifyUserInfo?.username || 'spotify_user';
      
      const submissionData = {
        user1: formData.user1Service === 'spotify' ? spotifyUsername : formData.user1,
        user2: formData.user2Service === 'spotify' ? spotifyUsername : formData.user2,
        user1Service: formData.user1Service,
        user2Service: formData.user2Service,
        period: formData.period,
        limit: formData.limit,
        dataSource: 'mixed'
      };
      
      console.log('Submitting with data:', submissionData);

      await onSubmit(submissionData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInputIcon = (status) => {
    switch (status) {
      case 'loading': return <span className="text-blue-500 animate-spin">⟳</span>;
      case 'success': return <span className="text-green-500">✓</span>;
      case 'error': return <span className="text-red-500">⚠</span>;
      default: return <span className="text-gray-400">👤</span>;
    }
  };

  const getInputBorderColor = (status) => {
    switch (status) {
      case 'loading': return 'border-blue-300 focus:border-blue-500';
      case 'success': return 'border-green-300 focus:border-green-500';
      case 'error': return 'border-red-300 focus:border-red-500';
      default: return 'border-gray-300 focus:border-blue-500';
    }
  };

  const getServiceIcon = (service) => {
    return service === 'lastfm' ? '🎵' : '🎧';
  };

  const canSubmitForm = () => {
    // Use sessionStatus for Spotify validation instead of spotifyAuthStatus
    const user1Valid = formData.user1Service === 'spotify'
      ? (sessionStatus === 'authenticated' && session)
      : validationStates.user1.status === 'success';

    const user2Valid = formData.user2Service === 'spotify'
      ? (sessionStatus === 'authenticated' && session)
      : validationStates.user2.status === 'success';

    return user1Valid && user2Valid && !isSubmitting;
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card-elevated p-8">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Compare Music Tastes
          </h2>
          <p className="text-gray-600">
            Compare listening preferences between Last.fm and Spotify users
          </p>
        </div>

        <div className="space-y-6">
          {/* User 1 Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              First User
            </label>

            {/* Service selector for User 1 */}
            <div className="mb-3">
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => handleInputChange('user1Service', 'lastfm')}
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                    formData.user1Service === 'lastfm'
                      ? 'bg-red-50 border-red-200 text-red-700'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span>🎵</span>
                  <span>Last.fm</span>
                </button>
                <button
                  type="button"
                  disabled={formData.user2Service === 'spotify'}
                  onClick={() => handleInputChange('user1Service', 'spotify')}
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                    formData.user1Service === 'spotify'
                      ? 'bg-green-50 border-green-200 text-green-700'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  } ${formData.user2Service === 'spotify' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span>🎧</span>
                  <span>Spotify</span>
                </button>
              </div>
            </div>

            {formData.user1Service === 'lastfm' ? (
              <>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.user1}
                    onChange={(e) => handleInputChange('user1', e.target.value)}
                    placeholder="Enter Last.fm username"
                    className={`w-full pl-10 pr-10 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors ${getInputBorderColor(validationStates.user1.status)}`}
                  />
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <span className="text-gray-400">🎵</span>
                  </div>
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {getInputIcon(validationStates.user1.status)}
                  </div>
                </div>
                {validationStates.user1.message && (
                  <p className={`mt-1 text-sm ${
                    validationStates.user1.status === 'error' ? 'text-red-600' : 
                    validationStates.user1.status === 'success' ? 'text-green-600' : 'text-blue-600'
                  }`}>
                    {validationStates.user1.message}
                  </p>
                )}
                <ProfilePreview profile={validationStates.user1.profile} />
              </>
            ) : (
              <SpotifyUserDisplay
                authStatus={spotifyAuthStatus}
                userInfo={spotifyUserInfo}
                onLogin={initiateSpotifyLogin}
              />
            )}
          </div>

          {/* User 2 Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Second User
            </label>

            {/* Service selector for User 2 */}
            <div className="mb-3">
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => handleInputChange('user2Service', 'lastfm')}
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                    formData.user2Service === 'lastfm'
                      ? 'bg-red-50 border-red-200 text-red-700'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span>🎵</span>
                  <span>Last.fm</span>
                </button>
                <button
                  type="button"
                  disabled={formData.user1Service === 'spotify'}
                  onClick={() => handleInputChange('user2Service', 'spotify')}
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                    formData.user2Service === 'spotify'
                      ? 'bg-green-50 border-green-200 text-green-700'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  } ${formData.user1Service === 'spotify' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span>🎧</span>
                  <span>Spotify</span>
                </button>
              </div>
            </div>

            {formData.user2Service === 'lastfm' ? (
              <>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.user2}
                    onChange={(e) => handleInputChange('user2', e.target.value)}
                    placeholder="Enter Last.fm username"
                    className={`w-full pl-10 pr-10 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors ${getInputBorderColor(validationStates.user2.status)}`}
                  />
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <span className="text-gray-400">🎵</span>
                  </div>
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {getInputIcon(validationStates.user2.status)}
                  </div>
                </div>
                {validationStates.user2.message && (
                  <p className={`mt-1 text-sm ${
                    validationStates.user2.status === 'error' ? 'text-red-600' : 
                    validationStates.user2.status === 'success' ? 'text-green-600' : 'text-blue-600'
                  }`}>
                    {validationStates.user2.message}
                  </p>
                )}
                <ProfilePreview profile={validationStates.user2.profile} />
              </>
            ) : (
              <SpotifyUserDisplay
                authStatus={spotifyAuthStatus}
                userInfo={spotifyUserInfo}
                onLogin={initiateSpotifyLogin}
              />
            )}
          </div>

          {/* Analysis Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Period
              </label>
              <select
                value={formData.period}
                onChange={(e) => handleInputChange('period', e.target.value)}
                className="w-full py-3 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="overall">Overall</option>
                <option value="12month">12 months</option>
                <option value="6month">6 months</option>
                <option value="3month">3 months</option>
                <option value="1month">1 month</option>
                <option value="7day">7 days</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Analysis Depth
              </label>
              <select
                value={formData.limit}
                onChange={(e) => handleInputChange('limit', e.target.value)}
                className="w-full py-3 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="50">Compare Top 50</option>
                <option value="100">Compare Top 100</option>
                <option value="200">Compare Top 200</option>
                <option value="500">Compare Top 500</option>
              </select>
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmitForm()}
            className={`w-full py-3 px-6 rounded-lg font-medium transition-colors ${
              canSubmitForm()
                ? 'btn-lastfm'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center space-x-2">
                <span className="animate-spin">⟳</span>
                <span>Loading user listening data...</span>
              </span>
            ) : (
              'Compare Music Tastes'
            )}
          </button>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>
            You can compare Last.fm users with each other, or mix Last.fm and Spotify users for cross-platform compatibility analysis.
          </p>
        </div>
      </div>

    </div>
  );
};

// Spotify User Display Component
const SpotifyUserDisplay = ({ authStatus, userInfo, onLogin }) => {
  if (authStatus === 'checking') {
    return (
      <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
        <div className="flex items-center space-x-3">
          <div className="animate-spin w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full"></div>
          <span className="text-gray-600">Checking Spotify authentication...</span>
        </div>
      </div>
    );
  }

  if (authStatus === 'not_authenticated') {
    return (
      <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-3">Connect your Spotify account to use as comparison user</p>
          <button
            onClick={onLogin}
            className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center space-x-2 mx-auto"
          >
            <span>🎧</span>
            <span>Connect Spotify</span>
          </button>
        </div>
      </div>
    );
  }

  if (authStatus === 'authenticated' && userInfo) {
    // Handle images array - could be array of objects or strings
    const imageUrl = userInfo.images?.[0]?.url || userInfo.images?.[0] || null;
    
    return (
      <div className="border border-green-300 rounded-lg p-4 bg-green-50">
        <div className="flex items-center space-x-3">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={userInfo.displayName}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold">
                {(userInfo.displayName || userInfo.username || userInfo.email || 'U').charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <h3 className="font-semibold text-green-800">
              {userInfo.displayName || userInfo.username || userInfo.email?.split('@')[0] || 'Spotify User'}
            </h3>
            <p className="text-sm text-green-600">
              Spotify • {userInfo.country || 'Connected'}
            </p>
          </div>
          <div className="ml-auto">
            <span className="text-green-500">✓</span>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

// Profile Preview Component for Last.fm
const ProfilePreview = ({ profile }) => {
  if (!profile) return null;

  return (
    <div className="mt-2 p-3 bg-gray-50 rounded-lg border">
      <div className="flex items-center space-x-3">
        {profile.image && (
          <img
            src={profile.image}
            alt={profile.name}
            className="w-10 h-10 rounded-full object-cover"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <span className="font-medium text-gray-900 truncate">
              {profile.realname || profile.name}
            </span>
            <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">
              Last.fm
            </span>
            {profile.country && (
              <span className="text-xs text-gray-500">
                {profile.country}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <span className="flex items-center space-x-1">
              <span className="text-sm">🎵</span>
              <span>{parseInt(profile.playcount).toLocaleString()} plays</span>
            </span>
            {profile.registered && (
              <span className="text-xs">
                Since {new Date(profile.registered * 1000).getFullYear()}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedInputForm;