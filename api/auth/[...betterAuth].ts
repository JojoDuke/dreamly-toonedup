// api/auth/[...betterAuth].ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { toNodeHandler } from 'better-auth/node';
import { auth } from '../../backend/lib/auth.js'; // Corrected path relative to api/auth/[...]
import cors from 'cors'; // Import cors directly

// --- CORS Configuration ---
const trustedOrigins = [
  'http://localhost:8080',
  'https://toonlyai.com',
  'https://www.toonlyai.com'
].filter(Boolean) as string[];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || trustedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
  allowedHeaders: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
};
const corsHandler = cors(corsOptions);

// This single file handles all requests to /api/auth/*
// by passing them to the BetterAuth instance's Node handler

export default async function handler(req: VercelRequest, res: VercelResponse) {

  // Manually run CORS middleware
  await new Promise((resolve, reject) => {
    corsHandler(req as any, res as any, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });

  // If CORS handled OPTIONS or sent headers, stop execution
  if (req.method === 'OPTIONS' || res.headersSent) {
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