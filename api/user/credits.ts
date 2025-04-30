// api/user/credits.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';
import { auth } from '../../backend/lib/auth.js'; // Adjust path relative to api dir
import { runMiddleware, corsMiddleware } from '../lib/runMiddleware'; // Import new helpers
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Remove allowCors wrapper
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Run the CORS middleware
  await runMiddleware(req, res, corsMiddleware);

  // Handle OPTIONS
  if (req.method === 'OPTIONS') {
    return; 
  }

  // --- Allow GET method only (Now checked *after* CORS) ---
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  let dbClient;
  try {
    // --- Authentication ---
    const headers = new Headers(req.headers as HeadersInit);
    const sessionData = await auth.api.getSession({ headers });

    if (!sessionData?.session?.userId) {
      return res.status(401).json({ error: 'Unauthorized: No active session or user ID.' });
    }
    const userId = sessionData.session.userId;

    // --- Database Connection ---
    try {
      dbClient = await pool.connect();
    } catch (dbError: any) {
      console.error("Credits API - DB connection error:", dbError);
      return res.status(503).json({ error: 'Service Unavailable: Cannot connect to database.' });
    }

    // --- Fetch Credits ---
    const userResult = await dbClient.query('SELECT credits FROM "user" WHERE id = $1', [userId]);

    if (userResult.rows.length === 0) {
      console.warn(`Credits API - User ${userId} found in session but not in user table. Returning 0 credits.`);
      // TODO: Consider creating user with default credits here if this case occurs
      return res.status(200).json({ credits: 0 }); // Return 0 if user record doesn't exist yet
    }

    const currentCredits = userResult.rows[0].credits;
    return res.status(200).json({ credits: currentCredits });

  } catch (error: any) {
    // --- General Error Handling ---
    console.error("Unhandled error in /api/user/credits:", error);
    const errorMessage = error.message || "Unknown server error";
    const errorStatus = error?.status || 500;
    return res.status(errorStatus).json({ error: 'Internal server error fetching credits.', details: errorMessage });

  } finally {
    // --- Release DB Client ---
    if (dbClient) {
      dbClient.release();
    }
  }
} 