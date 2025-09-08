export default function handler(req, res) {
  const headers = {};
  
  // Copy only safe headers
  ['cookie', 'user-agent', 'referer', 'host', 'x-forwarded-for', 'x-real-ip'].forEach(header => {
    if (req.headers[header]) {
      headers[header] = req.headers[header];
    }
  });
  
  // Parse cookies manually
  const cookies = {};
  if (req.headers.cookie) {
    req.headers.cookie.split(';').forEach(c => {
      const parts = c.trim().split('=');
      if (parts.length >= 2) {
        const name = parts[0];
        const value = parts.slice(1).join('='); // Handle values with '=' in them
        cookies[name] = value.substring(0, 50) + (value.length > 50 ? '...' : '');
      }
    });
  }
  
  res.status(200).json({
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    headers: headers,
    cookieNames: Object.keys(cookies),
    cookies: cookies,
    hasCookies: Object.keys(cookies).length > 0,
    nextAuthCookies: Object.keys(cookies).filter(name => 
      name.includes('next-auth') || name.includes('__Secure') || name.includes('__Host')
    ),
  });
}
