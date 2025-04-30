// api/edit-image.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';
import { OpenAI, toFile } from 'openai';
import { auth } from '../backend/lib/auth.js'; // Adjust path if needed
import { runMiddleware, corsMiddleware } from '../api/lib/runMiddleware'; // Import new helpers
import dotenv from 'dotenv';

// Load environment variables
dotenv.config(); // Vercel uses its own env var system, but this helps locally

// --- Configuration ---
// Initialize DB Pool (Consider moving to a shared lib or using Vercel helpers if available)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const openaiApiKey = process.env.OPENAI_API_KEY;
if (!openaiApiKey) {
  console.error("API Error: OPENAI_API_KEY is not set.");
  // In serverless, we can't easily exit, just log and fail the request
}
const client = new OpenAI({ apiKey: openaiApiKey });

// --- Vercel Serverless Function Handler ---
// Remove allowCors wrapper
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Run the CORS middleware
  await runMiddleware(req, res, corsMiddleware);

  // The cors middleware handles OPTIONS requests automatically
  // If the request method is OPTIONS, the middleware finishes the response
  // and we don't need to proceed further in the handler.
  if (req.method === 'OPTIONS') {
      // runMiddleware resolves after the middleware calls next() or ends the response.
      // If corsMiddleware ended the response (for OPTIONS), we might not need to explicitly return.
      // However, it's safer to return to prevent any further code execution.
      return; 
  }

  // --- Allow POST method only (Now checked *after* CORS) ---
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  let dbClient;
  try {
    // --- Authentication ---
    // Note: Vercel provides req.headers directly, compatible with Headers constructor
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
      console.error("Database connection error:", dbError);
      return res.status(503).json({ error: 'Service Unavailable: Cannot connect to database.' });
    }

    // --- Credit Check ---
    const requiredCredits = 10;
    let currentCredits = 0;
    try {
      const userResult = await dbClient.query('SELECT credits FROM "user" WHERE id = $1', [userId]);
      if (userResult.rows.length === 0) {
        console.warn(`User ${userId} not found in user table.`);
        // TODO: Decide how to handle missing user - create with default credits or deny?
        return res.status(404).json({ error: 'User profile not found.' });
      }
      currentCredits = userResult.rows[0].credits;

      if (currentCredits < requiredCredits) {
        return res.status(402).json({ error: `Insufficient credits. Need ${requiredCredits}, have ${currentCredits}.` });
      }
      console.log(`User ${userId} has ${currentCredits} credits. Proceeding.`);
    } catch (dbError: any) {
      console.error("Error fetching user credits:", dbError);
      return res.status(500).json({ error: 'Internal server error checking credits.' });
    }

    // --- Request Body Parsing & Validation ---
    // Vercel automatically parses JSON bodies for POST requests into req.body
    const { prompt, imageBase64 } = req.body;

    if (!prompt || !imageBase64) {
      return res.status(400).json({ error: 'Prompt and imageBase64 are required.' });
    }
    if (!imageBase64.startsWith('data:image/')) {
      return res.status(400).json({ error: 'imageBase64 does not seem to be a valid data URL.' });
    }
    console.log(`User ${userId} - Received image edit request with prompt: "${prompt}"`);

    // --- Image Preparation ---
    const base64Parts = imageBase64.match(/^data:(image\/\w+);base64,(.*)$/);
    if (!base64Parts || base64Parts.length !== 3) {
      return res.status(400).json({ error: 'Invalid imageBase64 format.' });
    }
    const imageType = base64Parts[1];
    const base64Data = base64Parts[2];
    const imageBuffer = Buffer.from(base64Data, 'base64');
    const preparedImage = await toFile(imageBuffer, 'inputImage.png', { type: imageType });
    console.log(`User ${userId} - Image prepared for API as ${imageType}.`);

    // --- Call OpenAI API ---
    console.log(`User ${userId} - Calling OpenAI images.edit API...`);
    const response = await client.images.edit({
      model: "gpt-image-1",
      image: preparedImage,
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "low" // Consider making this configurable or based on user tier later
    });
    console.log(`User ${userId} - OpenAI API response received.`);

    // --- Decrement Credits ---
    try {
      await dbClient.query('UPDATE "user" SET credits = credits - $1 WHERE id = $2', [requiredCredits, userId]);
      console.log(`User ${userId} - Successfully decremented ${requiredCredits} credits. New balance: ${currentCredits - requiredCredits}`);
    } catch (dbError: any) {
      console.error(`User ${userId} - Error decrementing credits:`, dbError);
      // Log error but continue to return image to user
    }

    // --- Handle OpenAI Response ---
    if (response.data && response.data[0]) {
      const editedBase64 = response.data[0].b64_json;
      if (editedBase64) {
        console.log(`User ${userId} - Successfully returning edited image as base64.`);
        return res.status(200).json({ editedImageBase64: `data:image/png;base64,${editedBase64}` });
      } else {
        const url = response.data[0].url;
        console.error(`User ${userId} - OpenAI API response missing b64_json. URL found:`, url || "None");
        return res.status(500).json({ error: 'API response did not contain expected image data.' });
      }
    } else {
      console.error(`User ${userId} - Invalid response structure from OpenAI API:`, response);
      return res.status(500).json({ error: 'Invalid response structure from OpenAI API.' });
    }

  } catch (error: any) {
    // --- General Error Handling ---
    console.error("Unhandled error in /api/edit-image:", error);
    const errorMessage = error?.response?.data?.error?.message || error.message || "Unknown server error";
    const errorStatus = error?.status || error?.response?.status || 500; // Prefer explicit status if attached
    return res.status(errorStatus).json({ error: 'Failed to process image.', details: errorMessage });

  } finally {
    // --- Release DB Client ---
    if (dbClient) {
      dbClient.release();
    }
  }
} 