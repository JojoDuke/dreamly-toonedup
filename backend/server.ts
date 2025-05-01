import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { OpenAI, toFile } from "openai";
import { Pool } from 'pg';

import { toNodeHandler } from 'better-auth/node';
import { auth } from './lib/auth.js';


// --- Configuration ---
dotenv.config({ path: '.env.local' });

// Initialize PostgreSQL Pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const app = express();
const PORT = 3001;
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!openaiApiKey) {
  console.error("[server.ts] Error: OPENAI_API_KEY is not set. Exiting.");
  process.exit(1);
}

const client = new OpenAI({ apiKey: openaiApiKey });

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
    }
  },
  credentials: true
};
app.use(cors(corsOptions));

// --- BetterAuth ---
app.all('/api/auth/{*any}', toNodeHandler(auth));

// Middleware to parse JSON request bodies
app.use(express.json({ limit: '50mb' }));

// --- API Routes ---

// Simple root route for health check
app.get('/', (req: Request, res: Response) => {
  res.send('Backend server for Image Editing is running!');
});

// --- Handler function for getting credits ---
async function handleGetUserCredits(req: Request, res: Response): Promise<void> {
  console.log(`[Credits Handler] Received request for /api/user/credits`);
  let dbClient;
  let sessionData;
  try {
    // 1. Check authentication
    console.log(`[Credits Handler] Checking session...`);
    const headers = new Headers();
    Object.entries(req.headers).forEach(([key, value]) => {
      if (value) { headers.append(key, Array.isArray(value) ? value.join(', ') : value); }
    });
    
    // Explicitly log getSession attempt and result
    try {
      console.log(`[Credits Handler] Attempting auth.api.getSession...`);
      sessionData = await auth.api.getSession({ headers });
      console.log(`[Credits Handler] auth.api.getSession result:`, sessionData ? { session: !!sessionData.session, user: !!sessionData.user } : null);
    } catch (authError) {
      console.error(`[Credits Handler] Error calling auth.api.getSession:`, authError);
      res.status(500).json({ error: 'Internal server error during authentication check.' });
      return;
    }

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
  let sessionData;
  // 0. Authentication & Authorization Check
  console.log(`[Edit Image Handler] Checking session...`);
  const headers = new Headers();
  Object.entries(req.headers).forEach(([key, value]) => {
    if (value) { headers.append(key, Array.isArray(value) ? value.join(', ') : value); }
  });

  // Explicitly log getSession attempt and result
  try {
    console.log(`[Edit Image Handler] Attempting auth.api.getSession...`);
    sessionData = await auth.api.getSession({ headers });
    console.log(`[Edit Image Handler] auth.api.getSession result:`, sessionData ? { session: !!sessionData.session, user: !!sessionData.user } : null);
  } catch (authError) {
    console.error(`[Edit Image Handler] Error calling auth.api.getSession:`, authError);
    res.status(500).json({ error: 'Internal server error during authentication check.' });
    return;
  }

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

app.post('/webhook/all-dodo-payments', async (req: Request, res: Response) => {
  console.log('--- DODO WEBHOOK HANDLER ENTERED ---'); 
  const event = req.body; 
  res.status(200).send('OK'); 

  try {
    // Process only successful payment events (adjust type if needed)
    if (event?.type === 'payment.succeeded') { 
      console.log('[Webhook] Processing payment.succeeded event...');
      
      // --- Extract required data (adjust paths based on logged payload) ---
      const userId = event?.data?.metadata?.user_id;
      const amountToCredit = event?.data?.metadata?.credit_amount;

      // --- Update Database ---
      let dbClient;
      try {
        console.log(`[Webhook] Connecting to DB to update credits for user ${userId}...`);
        dbClient = await pool.connect();
        console.log(`[Webhook] DB connected. Adding ${amountToCredit} credits to user ${userId}...`);
        
        const updateResult = await dbClient.query(
          'UPDATE "user" SET credits = credits + $1 WHERE id = $2',
          [amountToCredit, userId]
        );

        // Check rowCount exists and is greater than 0
        if (updateResult?.rowCount && updateResult.rowCount > 0) {
          console.log(`[Webhook] Successfully added ${amountToCredit} credits to user ${userId}.`);
        } else {
          // Important: Handle case where user ID from webhook doesn't exist in your DB
          console.warn(`[Webhook] User ${userId} not found in DB. Could not update credits.`);
        }

      } catch (dbError) {
        console.error(`[Webhook] Database error updating credits for user ${userId}:`, dbError);
        // Log error, but don't try to send response (already sent OK)
      } finally {
        if (dbClient) {
          console.log(`[Webhook] Releasing DB client for user ${userId}.`);
          dbClient.release();
        }
      }

    } else {
      console.log(`[Webhook] Received event type: ${event?.type || 'unknown'}. No action taken.`);
    }
  } catch (processingError) {
    // Catch any unexpected errors during processing
    console.error('[Webhook] Error processing webhook payload:', processingError);
  }

  console.log('--- DODO WEBHOOK HANDLER FINISHED ---');
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`[Server] Express server listening successfully on port ${PORT}`);
});
