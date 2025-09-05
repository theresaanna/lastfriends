// components/ProgressTracker.js - Progress tracking component
import { useState, useEffect } from 'react';

export function ProgressTracker({ jobId, onComplete, onError }) {
  const [status, setStatus] = useState(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!jobId) return;

    let interval;
    let completed = false;

    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/jobs?jobId=${jobId}`);
        const data = await response.json();

        if (data.success) {
          setStatus(data.status);
          setProgress(data.progress || 0);

          if (data.status === 'completed') {
            completed = true;
            clearInterval(interval);
            onComplete?.(data.result);
          } else if (data.status === 'failed') {
            completed = true;
            clearInterval(interval);
            setError(data.error || 'Job failed');
            onError?.(data.error);
          }
        }
      } catch (err) {
        console.error('Error checking job status:', err);
        setError('Failed to check job status');
        onError?.(err.message);
        clearInterval(interval);
      }
    };

    // Check immediately
    checkStatus();

    // Then check every 2 seconds
    interval = setInterval(checkStatus, 2000);

    return () => {
      clearInterval(interval);
    };
  }, [jobId, onComplete, onError]);

  if (!jobId) return null;

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
        <div className="flex items-center">
          <div className="text-red-600 mr-2">❌</div>
          <div>
            <p className="text-red-800 font-medium">Background Job Failed</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'completed') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
        <div className="flex items-center">
          <div className="text-green-600 mr-2">✅</div>
          <div>
            <p className="text-green-800 font-medium">Enhanced Data Collection Complete</p>
            <p className="text-green-600 text-sm">More comprehensive analysis will be available on your next comparison</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-center mb-2">
        <div className="text-blue-600 mr-2">🔄</div>
        <div>
          <p className="text-blue-800 font-medium">Collecting Enhanced Music Data</p>
          <p className="text-blue-600 text-sm">
            Status: {status || 'Starting'} • {progress}% complete
          </p>
        </div>
      </div>

      <div className="w-full bg-blue-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      <p className="text-xs text-blue-500 mt-2">
        This process collects more comprehensive track data for better compatibility analysis
      </p>
    </div>
  );
}