// api/auth/[...betterAuth].ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { toNodeHandler } from 'better-auth/node';
import { auth } from '../../backend/lib/auth.js'; // Corrected path relative to api/auth/[...]
import { allowCors } from '../lib/cors'; // Corrected import path

// This single file handles all requests to /api/auth/*
// by passing them to the BetterAuth instance's Node handler

// Wrap the handler with allowCors
export default allowCors(async function handler(req: VercelRequest, res: VercelResponse) {
  // Make sure the request and response objects are compatible
  // with what toNodeHandler expects (Node.js standard http.IncomingMessage/ServerResponse)
  // Vercel's req/res are generally compatible enough or wrappers.

  // toNodeHandler does not return a promise directly suitable for async/await
  // It handles the response internally. We await it just in case, though.
  await toNodeHandler(auth)(req as any, res as any);
  // Since toNodeHandler handles the response, we don't explicitly return anything here.
  // The wrapper will still handle CORS headers before this is called.
}); 