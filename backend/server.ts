import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { OpenAI, toFile } from "openai";
import { Pool } from 'pg';

import { toNodeHandler } from 'better-auth/node';
import { auth } from './lib/auth.js';

// console.log("[server.ts] Script start."); // Removed

// --- Configuration ---
dotenv.config({ path: '.env.local' });
// console.log("[server.ts] dotenv configured."); // Removed

// console.log(`[server.ts] DATABASE_URL is set: ${!!process.env.DATABASE_URL}`); // Removed
// console.log("[server.ts] Creating main database pool..."); // Removed
// Initialize PostgreSQL Pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
// console.log("[server.ts] Main database pool created."); // Removed

// console.log("[server.ts] Initializing Express app..."); // Removed
const app = express();
const PORT = process.env.PORT || 3001;
// console.log(`[server.ts] PORT determined: ${PORT}`); // Removed
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!openaiApiKey) {
  console.error("[server.ts] Error: OPENAI_API_KEY is not set. Exiting.");
  process.exit(1);
}
// console.log("[server.ts] OPENAI_API_KEY check passed."); // Removed

// console.log("[server.ts] Creating OpenAI client..."); // Removed
const client = new OpenAI({ apiKey: openaiApiKey });
// console.log("[server.ts] OpenAI client created."); // Removed

// console.log("[server.ts] Configuring middleware (CORS, JSON)..."); // Removed
// --- Middleware ---

// Define trusted origins
const trustedOrigins = [
  'http://localhost:8080', // Local dev frontend
  'https://toonlyai.com', // Production frontend (non-www)
  'https://www.toonlyai.com' // Production frontend (www)
].filter(Boolean); // Filter out any potential undefined/empty values

// !! IMPORTANT: Apply CORS *before* route handlers that need it !!
const corsOptions: cors.CorsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (like mobile apps or curl requests)
    // Allow requests from whitelisted origins
    if (!origin || trustedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true
};
app.use(cors(corsOptions));

// --- BetterAuth ---
// console.log("[server.ts] Configuring BetterAuth handler..."); // Removed
app.all('/api/auth/{*any}', toNodeHandler(auth));
// console.log("[server.ts] BetterAuth handler configured."); // Removed

// Middleware to parse JSON request bodies
app.use(express.json({ limit: '50mb' }));
// console.log("[server.ts] Middleware configured."); // Removed

// console.log("[server.ts] Defining API routes..."); // Removed
// --- API Routes ---

// Simple root route for health check
app.get('/', (req: Request, res: Response) => {
  res.send('Backend server for Image Editing is running!');
});

// --- Handler function for getting credits ---
async function handleGetUserCredits(req: Request, res: Response): Promise<void> {
  console.log(`[Credits Handler] Received request for /api/user/credits`);
  let dbClient;
  try {
    // 1. Check authentication
    console.log(`[Credits Handler] Checking session...`);
    const headers = new Headers();
    Object.entries(req.headers).forEach(([key, value]) => {
      if (value) { headers.append(key, Array.isArray(value) ? value.join(', ') : value); }
    });
    const sessionData = await auth.api.getSession({ headers });
    if (!sessionData?.session?.userId) {
      console.log(`[Credits Handler] Unauthorized: No session/userId found.`);
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const userId = sessionData.session.userId;
    console.log(`[Credits Handler] User authenticated: ${userId}`);

    // 2. Connect to DB
    console.log(`[Credits Handler] Connecting to DB for user ${userId}...`);
    dbClient = await pool.connect();
    console.log(`[Credits Handler] DB connected for user ${userId}.`);

    // 3. Fetch credits
    console.log(`[Credits Handler] Fetching credits for user ${userId}...`);
    const userResult = await dbClient.query('SELECT credits FROM "user" WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      console.warn(`[Credits Handler] User ${userId} not found in user table. Returning 0 credits.`);
      res.json({ credits: 0 });
    } else {
      const currentCredits = userResult.rows[0].credits;
      console.log(`[Credits Handler] User ${userId} has ${currentCredits} credits.`);
      res.json({ credits: currentCredits });
    }

  } catch (error: any) {
    console.error(`[Credits Handler] Error fetching credits for user:`, error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error fetching credits.' });
    }
  } finally {
    if (dbClient) {
      console.log(`[Credits Handler] Releasing DB client.`);
      dbClient.release();
    }
  }
}

// --- Endpoint registration using the handler ---
app.get('/api/user/credits', (req, res) => {
  handleGetUserCredits(req, res).catch(err => {
     console.error("[Server] Unhandled error in route wrapper for handleGetUserCredits:", err);
     if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error.' });
     }
  });
});

// Define the async function separately
async function handleEditImageLogic(req: Request, res: Response): Promise<void> {
  console.log(`[Edit Image Handler] Received request for /api/edit-image`);
  // 0. Authentication & Authorization Check
  console.log(`[Edit Image Handler] Checking session...`);
  const headers = new Headers();
  Object.entries(req.headers).forEach(([key, value]) => {
    if (value) { headers.append(key, Array.isArray(value) ? value.join(', ') : value); }
  });
  const sessionData = await auth.api.getSession({ headers });
  if (!sessionData?.session?.userId) {
    console.log(`[Edit Image Handler] Unauthorized: No session/userId found.`);
    res.status(401).json({ error: 'Unauthorized: No active session or user ID.' });
    return;
  }
  const userId = sessionData.session.userId;
  console.log(`[Edit Image Handler] User authenticated: ${userId}`);

  let dbClient;
  try {
    console.log(`[Edit Image Handler] Connecting to DB for user ${userId}...`);
    dbClient = await pool.connect();
    console.log(`[Edit Image Handler] DB connected for user ${userId}.`);

    // --- Credit Check ---
    console.log(`[Edit Image Handler] Checking credits for user ${userId}...`);
    const requiredCredits = 10;
    let currentCredits = 0;
    const userResult = await dbClient.query('SELECT credits FROM "user" WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
       // Handle case where user might exist in auth but not in our users table yet
       // For now, treat as error or create user with default credits?
       // Let's assume error for now.
       console.warn(`[Edit Image Handler] User ${userId} not found in users table.`);
       res.status(404).json({ error: 'User profile not found.' });
       dbClient.release();
       return;
    }
    currentCredits = userResult.rows[0].credits;

    if (currentCredits < requiredCredits) {
      console.log(`[Edit Image Handler] User ${userId} insufficient credits (${currentCredits}/${requiredCredits}).`);
      res.status(402).json({ error: `Insufficient credits. Need ${requiredCredits}, have ${currentCredits}.` });
      dbClient.release();
      return;
    }
    console.log(`[Edit Image Handler] User ${userId} has sufficient credits (${currentCredits}/${requiredCredits}).`);

    const { prompt, imageBase64 } = req.body;

    // Basic validation
    if (!prompt || !imageBase64) {
      res.status(400).json({ error: 'Prompt and imageBase64 are required in the request body.' });
      return; // Explicitly return void
    }
    if (!imageBase64.startsWith('data:image/')) {
       res.status(400).json({ error: 'imageBase64 does not seem to be a valid data URL.'});
       return; // Explicitly return void
    }

    console.log(`[Edit Image Handler] User ${userId} requested transform with prompt: "${prompt}"`);

    // 1. Prepare image data from base64
    const base64Parts = imageBase64.match(/^data:(image\/\w+);base64,(.*)$/);
    if (!base64Parts || base64Parts.length !== 3) {
       res.status(400).json({ error: 'Invalid imageBase64 format.' });
       return; // Explicitly return void
    }
    const imageType = base64Parts[1]; 
    const base64Data = base64Parts[2];
    const imageBuffer = Buffer.from(base64Data, 'base64');
    const preparedImage = await toFile(imageBuffer, 'inputImage.png', { type: imageType }); 
    console.log(`[Edit Image Handler] Image prepared for API as ${imageType}.`);

    // 2. Call the images.edit endpoint with gpt-image-1
    console.log(`[Edit Image Handler] Calling OpenAI API for user ${userId}...`);
    const response = await client.images.edit({
      model: "gpt-image-1", 
      image: preparedImage,
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "low"
    });
    console.log(`[Edit Image Handler] OpenAI API response received for user ${userId}.`);

    // 3. Decrement Credits on Success
    try {
      console.log(`[Edit Image Handler] Decrementing credits for user ${userId}...`);
      await dbClient.query('UPDATE "user" SET credits = credits - $1 WHERE id = $2', [requiredCredits, userId]);
      console.log(`[Edit Image Handler] Successfully decremented ${requiredCredits} credits for user ${userId}.`);
    } catch (dbError: any) {
       console.error(`[Edit Image Handler] Error decrementing credits for user ${userId}:`, dbError);
       // Don't block the response, but log the error. Consider queuing a retry?
       // For now, just log it.
    }

    // 4. Handle OpenAI Response (expecting b64_json)
    if (response.data && response.data[0]) {
      const editedBase64 = response.data[0].b64_json;
      if (editedBase64) {
         console.log(`[Edit Image Handler] Successfully received edited image for user ${userId}.`);
         res.json({ editedImageBase64: `data:image/png;base64,${editedBase64}` }); 
         // return implied void
      } else {
         const url = response.data[0].url;
         console.error(`[Edit Image Handler] API response missing b64_json for user ${userId}. URL found:`, url || "None");
         res.status(500).json({ error: 'API response did not contain expected image data.' });
         // return implied void
      }
    } else {
      console.error(`[Edit Image Handler] Invalid response structure from OpenAI API for user ${userId}:`, response);
      res.status(500).json({ error: 'Invalid response structure from OpenAI API.' });
      // return implied void
    }

  } catch (error: any) {
    console.error(`[Edit Image Handler] Error processing image for user ${userId}:`, error);
    const errorMessage = error.response?.data?.error?.message || error.message || "Unknown error occurred";
    const errorStatus = error.response?.status || 500;
    res.status(errorStatus).json({ error: 'Failed to edit image due to an API error.', details: errorMessage });
    // return implied void
  } finally {
    // Ensure database client is always released
    if (dbClient) {
      console.log(`[Edit Image Handler] Releasing DB client for user ${userId}.`);
      dbClient.release();
    }
  }
}

// Image Editing Endpoint - Wrap the async function call
app.post('/api/edit-image', (req: Request, res: Response) => {
  handleEditImageLogic(req, res).catch(err => {
    console.error("[Server] Unhandled error in route wrapper for handleEditImageLogic:", err);
    if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error.' });
    }
  });
});

// console.log("[server.ts] API routes defined."); // Removed

// --- Start Server ---
// console.log(`[server.ts] Attempting to listen on port ${PORT}...`); // Removed
app.listen(PORT, () => {
  console.log(`[Server] Express server listening successfully on port ${PORT}`);
});
