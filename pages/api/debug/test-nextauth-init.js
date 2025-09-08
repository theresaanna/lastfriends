// pages/api/debug/test-nextauth-init.js
// Test endpoint to check NextAuth initialization
import { getCsrfToken, getProviders } from 'next-auth/react';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  
  const result = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    headers: {
      host: req.headers.host,
      'x-forwarded-host': req.headers['x-forwarded-host'],
      'x-forwarded-proto': req.headers['x-forwarded-proto'],
    },
  };

  try {
    // Try to get CSRF token (this is what's failing in your app)
    const csrfToken = await getCsrfToken({ req });
    result.csrfToken = csrfToken ? 'obtained' : 'null';
    
    // Try to get providers
    const providers = await getProviders();
    result.providers = providers ? Object.keys(providers) : [];
    
    result.success = true;
  } catch (error) {
    result.success = false;
    result.error = {
      message: error.message,
      name: error.name,
      // Only in dev mode show stack
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    };
  }
  
  // Also test manual initialization
  try {
    const NextAuth = (await import('../auth/[...nextauth].js')).default;
    result.nextAuthImport = {
      success: true,
      isFunction: typeof NextAuth === 'function',
    };
    
    // Try to create a mock request/response to test NextAuth
    if (typeof NextAuth === 'function') {
      const mockReq = {
        ...req,
        query: { nextauth: ['csrf'] },
        method: 'GET',
      };
      const mockRes = {
        status: (code) => ({ 
          json: (data) => ({ statusCode: code, data }),
          end: () => ({ statusCode: code }),
        }),
        setHeader: () => {},
        end: () => {},
      };
      
      const response = await NextAuth(mockReq, mockRes);
      result.mockCsrfTest = {
        success: true,
        response: response ? 'handled' : 'no-response',
      };
    }
  } catch (error) {
    result.nextAuthImport = {
      success: false,
      error: error.message,
    };
  }
  
  res.status(200).json(result);
}
