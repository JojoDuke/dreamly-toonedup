import { VercelRequest, VercelResponse } from '@vercel/node';

const trustedOrigins = [
  'http://localhost:8080',
  'https://toonlyai.com',
  'https://www.toonlyai.com'
].filter(Boolean) as string[];

// Allow the wrapped function to return void, Promise<void>, or Promise<VercelResponse>
type VercelFunction = (req: VercelRequest, res: VercelResponse) => Promise<void | VercelResponse> | void | VercelResponse;

export const allowCors = (fn: VercelFunction) => async (req: VercelRequest, res: VercelResponse) => {
  const origin = req.headers.origin;

  // Set common headers
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' // Added Authorization
  );
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Dynamically set Allow-Origin based on trusted list
  if (origin && trustedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    // Optional: Block requests from untrusted origins entirely,
    // or fallback to a default (like the first trusted origin) if needed,
    // or omit the header (browser will block).
    // For now, we'll only set it if the origin is trusted.
    // If no origin header is present (e.g., same-origin requests, server-to-server), this is fine.
  }

  // Handle OPTIONS preflight request
  if (req.method === 'OPTIONS') {
    // Preflight request needs 2xx response
    res.status(204).end(); // 204 No Content is standard for preflight
    return;
  }

  // Call the actual Vercel function handler
  return await fn(req, res);
}; 