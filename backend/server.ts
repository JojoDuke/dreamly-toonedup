import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { OpenAI, toFile } from "openai";
import { Pool } from 'pg';
import { Webhook } from 'standardwebhooks';

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
const dodoWebhookSecret = process.env.DODO_PAYMENTS_WEBHOOK_KEY;

if (!openaiApiKey) {
  console.error("[server.ts] Error: OPENAI_API_KEY is not set. Exiting.");
  process.exit(1);
}
if (!dodoWebhookSecret) {
  console.warn("[server.ts] Warning: DODO_PAYMENTS_WEBHOOK_KEY is not set. Webhook verification disabled.");
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
    if (!origin || trustedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS')); // Deny if origin not in list
    }
  },
  credentials: true
};
app.use(cors(corsOptions));

// --- BetterAuth ---
app.all('/api/auth/{*any}', toNodeHandler(auth));

// Middleware to parse JSON request bodies
app.use('/api', express.json({ limit: '50mb' }));

// --- API Routes ---

// Simple root route for health check
app.get('/', (req: Request, res: Response) => {
  res.send('Backend server for Image Editing is running!');
});

// --- Handler function for getting credits ---
async function handleGetUserCredits(req: Request, res: Response): Promise<void> {
  let dbClient;
  let sessionData;
  try {
    // 1. Check authentication
    const headers = new Headers();
    Object.entries(req.headers).forEach(([key, value]) => {
      if (value) { headers.append(key, Array.isArray(value) ? value.join(', ') : value); }
    });
    
    try {
      sessionData = await auth.api.getSession({ headers });
    } catch (authError) {
      console.error(`[Credits Handler] Error calling auth.api.getSession:`, authError);
      res.status(500).json({ error: 'Internal server error during authentication check.' });
      return;
    }

    if (!sessionData?.session?.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const userId = sessionData.session.userId;
    
    // 2. Connect to DB
    dbClient = await pool.connect();

    // 3. Fetch credits
    const userResult = await dbClient.query('SELECT credits FROM "user" WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      console.warn(`[Credits Handler] User ${userId} not found in user table. Returning 0 credits.`);
      res.json({ credits: 0 });
    } else {
      const currentCredits = userResult.rows[0].credits;
      res.json({ credits: currentCredits });
    }

  } catch (error: any) {
    console.error(`[Credits Handler] Error fetching credits for user:`, error);
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
     console.error("[Server] Unhandled error in route wrapper for handleGetUserCredits:", err);
     if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error.' });
     }
  });
});

// --- Handler function for getting user status ---
async function handleGetUserStatus(req: Request, res: Response): Promise<void> {
  let dbClient;
  let sessionData;
  try {
    // 1. Check authentication
    const headers = new Headers();
    Object.entries(req.headers).forEach(([key, value]) => {
      if (value) { headers.append(key, Array.isArray(value) ? value.join(', ') : value); }
    });

    try {
      sessionData = await auth.api.getSession({ headers });
    } catch (authError) {
      console.error(`[Status Handler] Error calling auth.api.getSession:`, authError);
      res.status(500).json({ error: 'Internal server error during authentication check.' });
      return;
    }

    if (!sessionData?.session?.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const userId = sessionData.session.userId;
    console.log(`[Status Handler] User authenticated: ${userId}`); // Log auth success

    // 2. Connect to DB
    dbClient = await pool.connect();

    // 3. Fetch subscription status
    const userResult = await dbClient.query('SELECT subscription_active FROM "user" WHERE id = $1', [userId]);
    
    let isSubscribed = false; // Default to false
    if (userResult.rows.length === 0) {
      console.warn(`[Status Handler] User ${userId} not found in user table. Returning isSubscribed: false.`);
    } else {
      isSubscribed = userResult.rows[0].subscription_active || false; // Handle null/undefined just in case
    }
    res.json({ isSubscribed });

  } catch (error: any) {
    console.error(`[Status Handler] Error fetching status for user:`, error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error fetching status.' });
    }
  } finally {
    if (dbClient) {
      dbClient.release();
    }
  }
}

// --- Endpoint registration for user status ---
app.get('/api/user/status', (req, res) => {
  handleGetUserStatus(req, res).catch(err => {
     console.error("[Server] Unhandled error in route wrapper for handleGetUserStatus:", err);
     if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error.' });
     }
  });
});

// Define the async function separately
async function handleEditImageLogic(req: Request, res: Response): Promise<void> {
  let sessionData;
  // 0. Authentication & Authorization Check
  const headers = new Headers();
  Object.entries(req.headers).forEach(([key, value]) => {
    if (value) { headers.append(key, Array.isArray(value) ? value.join(', ') : value); }
  });

  try {
    sessionData = await auth.api.getSession({ headers });
  } catch (authError) {
    console.error(`[Edit Image Handler] Error calling auth.api.getSession:`, authError);
    res.status(500).json({ error: 'Internal server error during authentication check.' });
    return;
  }

  if (!sessionData?.session?.userId) {
    res.status(401).json({ error: 'Unauthorized: No active session or user ID.' });
    return;
  }
  const userId = sessionData.session.userId;
  
  let dbClient;
  let isSubscribedUser = false; // To track if this is a subscribed user edit
  
  try {
    dbClient = await pool.connect();

    // --- Credit Check & Get Subscription Status ---
    const requiredCredits = 10;
    let currentCredits = 0;
    // Fetch credits AND subscription status in one query
    const userResult = await dbClient.query('SELECT credits, subscription_active FROM "user" WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
       console.warn(`[Edit Image Handler] User ${userId} not found in users table.`);
       res.status(404).json({ error: 'User profile not found.' });
       dbClient.release();
       return;
    }
    currentCredits = userResult.rows[0].credits;
    isSubscribedUser = userResult.rows[0].subscription_active || false; // Check subscription

    if (currentCredits < requiredCredits) {
      res.status(402).json({ error: `Insufficient credits. Need ${requiredCredits}, have ${currentCredits}.` });
      dbClient.release();
      return;
    }
    
    const { prompt, imageBase64 } = req.body;

    // Basic validation
    if (!prompt || !imageBase64) {
      res.status(400).json({ error: 'Prompt and imageBase64 are required in the request body.' });
      return; 
    }
    if (!imageBase64.startsWith('data:image/')) {
       res.status(400).json({ error: 'imageBase64 does not seem to be a valid data URL.'});
       return; 
    }

    // LOG TRANSFORM START (Include subscriber status if applicable)
    console.log(`[Edit Image Handler] User ${userId}${isSubscribedUser ? ' (Subscriber)' : ''} requested transform/edit with prompt: "${prompt}"`);

    // 1. Prepare image data from base64
    const base64Parts = imageBase64.match(/^data:(image\/\w+);base64,(.*)$/);
    if (!base64Parts || base64Parts.length !== 3) {
       res.status(400).json({ error: 'Invalid imageBase64 format.' });
       return; 
    }
    const imageType = base64Parts[1]; 
    const base64Data = base64Parts[2];
    const imageBuffer = Buffer.from(base64Data, 'base64');
    const preparedImage = await toFile(imageBuffer, 'inputImage.png', { type: imageType }); 

    // 2. Call the images.edit endpoint with gpt-image-1
    const response = await client.images.edit({
      model: "gpt-image-1", 
      image: preparedImage,
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "high"
    });

    // 3. Decrement Credits on Success (Keep log for this?) - Removed, let's rely on webhook for source of truth
    try {
      await dbClient.query('UPDATE "user" SET credits = credits - $1 WHERE id = $2', [requiredCredits, userId]);
    } catch (dbError: any) {
       console.error(`[Edit Image Handler] Error decrementing credits for user ${userId}:`, dbError);
       // Continue anyway
    }

    // 4. Handle OpenAI Response (expecting b64_json)
    if (response.data && response.data[0]) {
      const editedBase64 = response.data[0].b64_json;
      if (editedBase64) {
         // Log successful completion
         console.log(`[Edit Image Handler] Successfully transformed/edited image for user ${userId}.`);
         res.json({ editedImageBase64: `data:image/png;base64,${editedBase64}` }); 
      } else {
         const url = response.data[0].url;
         console.error(`[Edit Image Handler] API response missing b64_json for user ${userId}. URL found:`, url || "None");
         res.status(500).json({ error: 'API response did not contain expected image data.' });
      }
    } else {
      console.error(`[Edit Image Handler] Invalid response structure from OpenAI API for user ${userId}:`, response);
      res.status(500).json({ error: 'Invalid response structure from OpenAI API.' });
    }

  } catch (error: any) {
    console.error(`[Edit Image Handler] Error processing image for user ${userId}:`, error);
    const errorMessage = error.response?.data?.error?.message || error.message || "Unknown error occurred";
    const errorStatus = error.response?.status || 500;
    res.status(errorStatus).json({ error: 'Failed to edit image due to an API error.', details: errorMessage });
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
    console.error("[Server] Unhandled error in route wrapper for handleEditImageLogic:", err);
    if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error.' });
    }
  });
});

// --- Webhook Endpoint (Uses RAW body parser) ---
app.post('/webhook/all-dodo-payments',
  // 1. Use express.raw() to get the raw body for this specific route
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response) => {
    
    // --- Signature Verification --- 
    if (!dodoWebhookSecret) {
      console.warn('[Webhook] DODO_PAYMENTS_WEBHOOK_KEY not set. Skipping verification.');
    } else {
      try {
        const webhook = new Webhook(dodoWebhookSecret);
        const headers = req.headers as Record<string, string>; 
        await webhook.verify(req.body, headers);
        // Verification success - no log needed here
      } catch (error: any) {
        console.error('[Webhook] Signature verification failed:', error.message || error);
        res.status(400).send('Webhook signature verification failed.');
        return; // Stop processing
      }
    }
    // --- End Signature Verification ---

    res.status(200).send('OK');

    let event;
    try {
      // 3. Parse the JSON from the raw body *after* verification
      event = JSON.parse(req.body.toString());
      // Don't need to log parsed event type here
    } catch (parseError) {
      console.error('[Webhook] Failed to parse JSON payload:', parseError);
      return;
    }

    // --- Process the event (using the parsed 'event' object) ---
    const userId = event?.data?.metadata?.user_id;
    const amountToCredit = event?.data?.metadata?.credit_amount;

    try {
      // Process payment.succeeded
      if (event?.type === 'payment.succeeded') {
        console.log(`[Webhook] Processing payment.succeeded for user ${userId}...`);

        if (!userId || amountToCredit === undefined || amountToCredit === null) {
           console.error(`[Webhook] Missing userId or amountToCredit in payment.succeeded metadata for event ID: ${event?.id}`);
        } else {
          // Database logic for payment
          let dbClient;
          try {
            dbClient = await pool.connect();
            const updateResult = await dbClient.query(
              'UPDATE "user" SET credits = credits + $1 WHERE id = $2',
              [amountToCredit, userId]
            );
            if (updateResult?.rowCount && updateResult.rowCount > 0) {
              // Log successful credit addition
              console.log(`[Webhook] User Purchase: Added ${amountToCredit} credits to user ${userId}.`); 
            } else {
              console.warn(`[Webhook] User ${userId} not found in DB. Could not update credits for payment.`);
            }
          } catch (dbError) {
            console.error(`[Webhook] Database error updating credits for user ${userId} (payment):`, dbError);
          } finally {
            if (dbClient) {
              dbClient.release();
            }
          }
        }
      }
      // Process subscription active/renewed
      else if (event?.type === 'subscription.active' || event?.type === 'subscription.renewed') {
        console.log(`[Webhook] Processing ${event.type} for user ${userId}...`);
        if (!userId) {
            console.error(`[Webhook] User ID missing in ${event.type} event metadata.`);
        } else {
            // Database logic for subscription active
            let dbClient;
            try {
              dbClient = await pool.connect();
              const updateResult = await dbClient.query(
                'UPDATE "user" SET subscription_active = TRUE WHERE id = $1',
                [userId]
              );
              if (updateResult?.rowCount && updateResult.rowCount > 0) {
                // Log successful subscription activation
                console.log(`[Webhook] User Subscription: Set subscription_active=TRUE for user ${userId}.`); 
              } else {
                 console.warn(`[Webhook] User ${userId} not found in DB when setting subscription active.`);
              }
            } catch (dbError) {
              console.error(`[Webhook] Database error updating subscription status active for user ${userId}:`, dbError);
            } finally {
              if (dbClient) {
                dbClient.release();
              }
            }
        }
      }
      // Process subscription expired
      else if (event?.type === 'subscription.expired') {
        console.log(`[Webhook] Processing subscription.expired for user ${userId}...`);
        if (!userId) {
            console.error(`[Webhook] User ID missing in subscription.expired event metadata.`);
        } else {
            // Database logic for subscription expired
            let dbClient;
            try {
              dbClient = await pool.connect();
              const updateResult = await dbClient.query(
                'UPDATE "user" SET subscription_active = FALSE WHERE id = $1',
                [userId]
              );
              if (updateResult?.rowCount && updateResult.rowCount > 0) {
                // Log successful subscription deactivation
                console.log(`[Webhook] User Subscription: Set subscription_active=FALSE for user ${userId}.`);
              } else {
                console.warn(`[Webhook] User ${userId} not found in DB when processing subscription expiry.`);
              }
            } catch (dbError) {
              console.error(`[Webhook] Database error updating subscription status expired for user ${userId}:`, dbError);
            } finally {
              if (dbClient) {
                dbClient.release();
              }
            }
        }
      }
      // Log unhandled known event types or default
      else {
        // Minimal log for other events
        console.log(`[Webhook] Received unhandled event type: ${event?.type || 'unknown'} for user ${userId || 'N/A'}.`); 
      }

    } catch (processingError) {
      console.error('[Webhook] Error processing webhook event payload:', processingError);
      // Already sent 200 OK, just log the error
    }

    // No need for finished log
  }
);

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`[Server] Express server listening successfully on port ${PORT}`);
});
