// api/auth/[...betterAuth].ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { toNodeHandler } from 'better-auth/node';
import { auth } from '../../backend/lib/auth.js'; // Corrected path relative to api/auth/[...]

// This single file handles all requests to /api/auth/*
// by passing them to the BetterAuth instance's Node handler.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Make sure the request and response objects are compatible 
  // with what toNodeHandler expects (Node.js standard http.IncomingMessage/ServerResponse)
  // Vercel's req/res are generally compatible enough or wrappers.
  return toNodeHandler(auth)(req as any, res as any);
} 