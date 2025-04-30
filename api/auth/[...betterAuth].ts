// api/auth/[...betterAuth].ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { toNodeHandler } from 'better-auth/node';
import { auth } from '../../backend/lib/auth.js'; // Corrected path relative to api/auth/[...]
import { runMiddleware, corsMiddleware } from '../lib/runMiddleware'; // Import new helpers

// This single file handles all requests to /api/auth/*
// by passing them to the BetterAuth instance's Node handler

// Remove allowCors wrapper
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Run the CORS middleware first
  await runMiddleware(req, res, corsMiddleware);

  // If CORS handled an OPTIONS request, it might have already sent a response.
  // Check if headers were sent before proceeding.
  // better-auth handles OPTIONS internally too, so this might be redundant,
  // but it's safer.
  if (res.headersSent) {
    return;
  }

  // Now pass to better-auth handler
  // Make sure the request and response objects are compatible
  // with what toNodeHandler expects (Node.js standard http.IncomingMessage/ServerResponse)
  // Vercel's req/res are generally compatible enough or wrappers.

  // toNodeHandler does not return a promise directly suitable for async/await
  // It handles the response internally. We await it just in case, though.
  await toNodeHandler(auth)(req as any, res as any);
  // Since toNodeHandler handles the response, we don't explicitly return anything here.
} 