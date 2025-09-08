// pages/api/debug/test-auth-direct.js
// Direct test of NextAuth endpoints

export default async function handler(req, res) {
  const host = req.headers.host || 'lastfriends.site';
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const baseUrl = `${protocol}://${host}`;
  
  const results = {};
  
  // Test 1: CSRF endpoint
  try {
    const csrfRes = await fetch(`${baseUrl}/api/auth/csrf`, {
      headers: {
        'Cookie': req.headers.cookie || '',
      },
    });
    const csrfText = await csrfRes.text();
    let csrfData;
    try {
      csrfData = JSON.parse(csrfText);
    } catch {
      csrfData = { parseError: true, rawText: csrfText.substring(0, 200) };
    }
    
    results.csrf = {
      status: csrfRes.status,
      ok: csrfRes.ok,
      headers: Object.fromEntries(csrfRes.headers.entries()),
      data: csrfData,
    };
  } catch (error) {
    results.csrf = {
      error: error.message,
      stack: error.stack?.split('\n').slice(0, 3).join('\n'),
    };
  }
  
  // Test 2: Providers endpoint
  try {
    const providersRes = await fetch(`${baseUrl}/api/auth/providers`);
    const providersText = await providersRes.text();
    let providersData;
    try {
      providersData = JSON.parse(providersText);
    } catch {
      providersData = { parseError: true, rawText: providersText.substring(0, 200) };
    }
    
    results.providers = {
      status: providersRes.status,
      ok: providersRes.ok,
      data: providersData,
    };
  } catch (error) {
    results.providers = {
      error: error.message,
    };
  }
  
  // Test 3: Session endpoint
  try {
    const sessionRes = await fetch(`${baseUrl}/api/auth/session`, {
      headers: {
        'Cookie': req.headers.cookie || '',
      },
    });
    const sessionText = await sessionRes.text();
    let sessionData;
    try {
      sessionData = JSON.parse(sessionText);
    } catch {
      sessionData = { parseError: true, rawText: sessionText.substring(0, 200) };
    }
    
    results.session = {
      status: sessionRes.status,
      ok: sessionRes.ok,
      data: sessionData,
    };
  } catch (error) {
    results.session = {
      error: error.message,
    };
  }
  
  // Test 4: Check if NextAuth handler can be imported
  try {
    const authModule = await import('../auth/[...nextauth].js');
    results.moduleImport = {
      success: true,
      hasDefault: typeof authModule.default === 'function',
    };
    
    // Try to call it with a mock CSRF request
    if (typeof authModule.default === 'function') {
      const mockReq = {
        ...req,
        query: { nextauth: ['csrf'] },
        method: 'GET',
        headers: req.headers,
      };
      
      let responseData = null;
      const mockRes = {
        status: (code) => ({
          json: (data) => {
            responseData = { statusCode: code, data };
            return mockRes;
          },
          end: () => {
            responseData = { statusCode: code };
            return mockRes;
          },
        }),
        setHeader: () => mockRes,
        end: () => mockRes,
        json: (data) => {
          responseData = { data };
          return mockRes;
        },
      };
      
      try {
        await authModule.default(mockReq, mockRes);
        results.directCall = {
          success: true,
          response: responseData,
        };
      } catch (callError) {
        results.directCall = {
          success: false,
          error: callError.message,
          stack: callError.stack?.split('\n').slice(0, 3).join('\n'),
        };
      }
    }
  } catch (error) {
    results.moduleImport = {
      success: false,
      error: error.message,
      stack: error.stack?.split('\n').slice(0, 3).join('\n'),
    };
  }
  
  // Summary
  results.summary = {
    timestamp: new Date().toISOString(),
    baseUrl,
    allEndpointsOk: results.csrf?.ok && results.providers?.ok && results.session?.ok,
    moduleLoads: results.moduleImport?.success,
    directCallWorks: results.directCall?.success,
  };
  
  res.status(200).json(results);
}
