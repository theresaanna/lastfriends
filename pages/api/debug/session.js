// pages/api/debug/session.js - Debug session issues
import { SessionManager } from '../../../utils/session.js';

export default async function handler(req, res) {
  try {
    // Get session stats
    const stats = SessionManager.getStats();

    // Get cookies from request
    const cookies = req.cookies || {};

    return res.status(200).json({
      cookiesReceived: Object.keys(cookies),
      sessionCookie: !!cookies.session,
      sessionStats: stats,
      headers: {
        cookie: req.headers.cookie || 'none',
        userAgent: req.headers['user-agent']
      }
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
}