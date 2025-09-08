// pages/api/debug/test-nextauth-init.js
// Test endpoint to check NextAuth initialization

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

  // Test direct CSRF endpoint call
  try {
    const csrfResponse = await fetch(`https://${req.headers.host}/api/auth/csrf`);
    const csrfData = await csrfResponse.json();
    result.csrfToken = csrfData.csrfToken ? 'obtained' : 'null';
    result.csrfEndpoint = {
      status: csrfResponse.status,
      ok: csrfResponse.ok,
      hasToken: !!csrfData.csrfToken
    };
  } catch (error) {
    result.csrfEndpoint = {
      error: error.message
    };
  }
  
  // Test providers endpoint
  try {
    const providersResponse = await fetch(`https://${req.headers.host}/api/auth/providers`);
    const providersData = await providersResponse.json();
    result.providers = providersData ? Object.keys(providersData) : [];
    result.providersEndpoint = {
      status: providersResponse.status,
      ok: providersResponse.ok
    };
  } catch (error) {
    result.providersEndpoint = {
      error: error.message
    };
  }
  
  result.success = true;
  
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
