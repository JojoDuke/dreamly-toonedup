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
const PORT = process.env.PORT || 3001;
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!openaiApiKey) {
  console.error("Error: OPENAI_API_KEY is not set in the environment variables.");
  process.exit(1);
}

const client = new OpenAI({ apiKey: openaiApiKey });

// --- Middleware ---


// !! IMPORTANT: Apply CORS *before* route handlers that need it !!
const corsOptions = {
  origin: process.env.BETTER_AUTH_URL || 'http://localhost:8080' || 'https://toonlyai.com' || 'https://www.toonlyai.com',
  credentials: true
};
app.use(cors(corsOptions));

// --- BetterAuth --- 
app.all('/api/auth/{*any}', toNodeHandler(auth));

// Middleware to parse JSON request bodies (increase limit for base64 images)
app.use(express.json({ limit: '50mb' })); 


// --- API Routes ---

// Simple root route for health check
app.get('/', (req: Request, res: Response) => {
  res.send('Backend server for Image Editing is running!');
});

// --- Handler function for getting credits ---
async function handleGetUserCredits(req: Request, res: Response): Promise<void> { 
  let dbClient;
  try {
    // 1. Check authentication
    const headers = new Headers();
    Object.entries(req.headers).forEach(([key, value]) => {
      if (value) { headers.append(key, Array.isArray(value) ? value.join(', ') : value); }
    });
    const sessionData = await auth.api.getSession({ headers });
    if (!sessionData?.session?.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return; // Explicit return
    }
    const userId = sessionData.session.userId;

    // 2. Connect to DB
    dbClient = await pool.connect();

    // 3. Fetch credits
    const userResult = await dbClient.query('SELECT credits FROM "user" WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      console.warn(`User ${userId} found in session but not in user table. Returning 0 credits.`);
      res.json({ credits: 0 });
      dbClient.release(); // Release before returning
      return; // Explicit return
    }

    const currentCredits = userResult.rows[0].credits;
    res.json({ credits: currentCredits });

  } catch (error: any) {
    console.error("Error fetching user credits:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error fetching credits.' });
    }
  } finally {
    if (dbClient) {
      dbClient.release();
    }
  }
}

// --- Endpoint registration using the handler ---
app.get('/api/user/credits', (req, res) => {
  handleGetUserCredits(req, res).catch(err => {
     console.error("Unhandled error in handleGetUserCredits:", err);
     if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error.' });
     }
  });
});

// Define the async function separately 
async function handleEditImageLogic(req: Request, res: Response): Promise<void> {
  // 0. Authentication & Authorization Check
  const headers = new Headers(); // Create a new Headers object
  Object.entries(req.headers).forEach(([key, value]) => {
    if (value) { // Ensure value is not undefined
      headers.append(key, Array.isArray(value) ? value.join(', ') : value);
    }
  });
  const sessionData = await auth.api.getSession({ headers });
  if (!sessionData?.session) {
    res.status(401).json({ error: 'Unauthorized: No active session.' });
    return;
  }
  const userId = sessionData.session.userId; // Assuming userId is on session
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized: User ID not found in session.' });
    return;
  }

  // --- Database Client --- Ensure connection before proceeding
  let dbClient;
  try {
    dbClient = await pool.connect();
  } catch (dbError: any) {
    console.error("Database connection error:", dbError);
    res.status(503).json({ error: 'Service Unavailable: Cannot connect to database.' });
    return;
  }

  // --- Credit Check ---
  const requiredCredits = 10;
  let currentCredits = 0;
  try {
    const userResult = await dbClient.query('SELECT credits FROM "user" WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
       // Handle case where user might exist in auth but not in our users table yet
       // For now, treat as error or create user with default credits?
       // Let's assume error for now.
       console.warn(`User ${userId} not found in users table.`);
       res.status(404).json({ error: 'User profile not found.' });
       dbClient.release();
       return;
    }
    currentCredits = userResult.rows[0].credits;

    if (currentCredits < requiredCredits) {
      res.status(402).json({ error: `Insufficient credits. Need ${requiredCredits}, have ${currentCredits}.` });
      dbClient.release();
      return;
    }
    console.log(`User ${userId} has ${currentCredits} credits. Proceeding with transformation.`);
  } catch (dbError: any) {
    console.error("Error fetching user credits:", dbError);
    res.status(500).json({ error: 'Internal server error checking credits.' });
    dbClient.release();
    return;
  }
  
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

  console.log(`Received image edit request with prompt: "${prompt}"`);

  try {
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
    console.log(`Image prepared for API as ${imageType}.`);

    // 2. Call the images.edit endpoint with gpt-image-1
    console.log("Calling OpenAI images.edit API with gpt-image-1...");
    const response = await client.images.edit({
      model: "gpt-image-1", 
      image: preparedImage,
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "low"
    });
    console.log("API response received.");

    // 3. Decrement Credits on Success
    try {
      await dbClient.query('UPDATE "user" SET credits = credits - $1 WHERE id = $2', [requiredCredits, userId]);
      console.log(`Successfully decremented ${requiredCredits} credits for user ${userId}. New balance: ${currentCredits - requiredCredits}`);
    } catch (dbError: any) {
       console.error("Error decrementing credits:", dbError);
       // Don't block the response, but log the error. Consider queuing a retry?
       // For now, just log it.
    }

    // 4. Handle OpenAI Response (expecting b64_json)
    if (response.data && response.data[0]) {
      const editedBase64 = response.data[0].b64_json;
      if (editedBase64) {
         console.log("Successfully received edited image as base64.");
         res.json({ editedImageBase64: `data:image/png;base64,${editedBase64}` }); 
         // return implied void
      } else {
         const url = response.data[0].url;
         console.error("API response missing b64_json. URL found:", url || "None");
         res.status(500).json({ error: 'API response did not contain expected image data.' });
         // return implied void
      }
    } else {
      console.error("Invalid response structure from OpenAI API:", response);
      res.status(500).json({ error: 'Invalid response structure from OpenAI API.' });
      // return implied void
    }

  } catch (error: any) {
    console.error("Error during OpenAI API call or processing:", error);
    const errorMessage = error.response?.data?.error?.message || error.message || "Unknown error occurred";
    const errorStatus = error.response?.status || 500;
    res.status(errorStatus).json({ error: 'Failed to edit image due to an API error.', details: errorMessage });
    // return implied void
  } finally {
    // Ensure database client is always released
    if (dbClient) {
      dbClient.release();
    }
  }
}

// Image Editing Endpoint - Wrap the async function call
app.post('/api/edit-image', (req: Request, res: Response) => {
  handleEditImageLogic(req, res).catch(err => {
    // Basic catch block in case the handler itself throws an unexpected error
    console.error("Unhandled error in handleEditImageLogic:", err);
    if (!res.headersSent) { // Check if response hasn't already been sent
        res.status(500).json({ error: 'Internal server error.' });
    }
  });
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
