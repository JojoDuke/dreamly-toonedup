import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { OpenAI, toFile } from "openai";
import { Pool } from 'pg';
import { Webhook } from 'standardwebhooks';
import fs from 'fs';
import path from 'path';

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
  'http://localhost:8080',
  'https://toonlyai.com',
  'https://www.toonlyai.com'
].filter(Boolean);

// !! IMPORTANT: Apply CORS *before* route handlers that need it !!
const corsOptions: cors.CorsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    if (!origin || trustedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      //callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};
app.use(cors(corsOptions));

// --- BetterAuth ---
// Note: The /api/auth/* endpoints (login, logout, session retrieval) are handled by better-auth.
// Logging *inside* these specific handlers might require checking better-auth's configuration options.
// However, handlers below that *use* auth.api.getSession() will log the outcome of the session check.
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
  console.log("[Credits Handler] Received request /api/user/credits");
  let dbClient;
  let sessionData;
  let userId: string | null = null; // Declare userId outside try

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

    // --- Try assertion with optional chaining --- 
    // @ts-ignore
    const extractedUserId = (sessionData?.session as any)?.userId as string | undefined;
    // --- End Try assertion --- 

    if (!extractedUserId) { // Check if userId was found
      console.log("[Credits Handler] Request unauthorized (no session/userId).");
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    userId = extractedUserId; // Assign to outer scope userId
    
    console.log(`[Credits Handler] User authenticated: ${userId}`);
    
    // 2. Connect to DB
    console.log(`[Credits Handler] Attempting DB connection for user ${userId}`);
    dbClient = await pool.connect();
    console.log(`[Credits Handler] DB connected for user ${userId}`);

    // 3. Fetch credits
    console.log(`[Credits Handler] Attempting to fetch credits for user: ${userId}`); // Log before query
    const userResult = await dbClient.query('SELECT credits FROM "user" WHERE id = $1', [userId]);
    
    if (userResult.rows.length === 0) {
      console.warn(`[Credits Handler] User ${userId} not found in user table. Returning 0 credits.`);
      res.json({ credits: 0 });
    } else {
      const currentCredits = userResult.rows[0].credits;
      console.log(`[Credits Handler] Fetched credits for user ${userId}: ${currentCredits}`); // Log successful fetch
      res.json({ credits: currentCredits });
    }

  } catch (error: any) {
    console.error(`[Credits Handler] Error processing request for user:`, error); // Keep detailed error log
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error fetching credits.' });
    }
  } finally {
    if (dbClient) {
      console.log(`[Credits Handler] Releasing DB connection for user ${userId || 'unknown'}`);
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
  console.log("[Status Handler] Received request /api/user/status");
  let dbClient;
  let sessionData;
  let userId: string | null = null; // Declare userId outside try

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

    // --- Try assertion with optional chaining --- 
    const extractedUserId = (sessionData?.session as any)?.userId as string | undefined;
    // --- End Try assertion --- 

    if (!extractedUserId) {
      console.log("[Status Handler] Request unauthorized (no session/userId).");
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    userId = extractedUserId; // Assign to outer scope userId

    console.log(`[Status Handler] User authenticated: ${userId}`);

    // 2. Connect to DB
    console.log(`[Status Handler] Attempting DB connection for user ${userId}`);
    dbClient = await pool.connect();
    console.log(`[Status Handler] DB connected for user ${userId}`);

    // 3. Fetch subscription status
    console.log(`[Status Handler] Attempting to fetch status for user: ${userId}`); // Log before query
    const userResult = await dbClient.query('SELECT subscription_active FROM "user" WHERE id = $1', [userId]);
    
    let isSubscribed = false; // Default to false
    if (userResult.rows.length === 0) {
      console.warn(`[Status Handler] User ${userId} not found in user table. Returning isSubscribed: false.`);
    } else {
      isSubscribed = userResult.rows[0].subscription_active || false; // Handle null/undefined just in case
      console.log(`[Status Handler] Fetched status for user ${userId}: isSubscribed=${isSubscribed}`); // Log successful fetch
    }
    res.json({ isSubscribed });

  } catch (error: any) {
    console.error(`[Status Handler] Error processing request for user:`, error); // Keep detailed error log
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error fetching status.' });
    }
  } finally {
    if (dbClient) {
      console.log(`[Status Handler] Releasing DB connection for user ${userId || 'unknown'}`);
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

// Transform Image Handler (10 credits)
async function handleTransformImageLogic(req: Request, res: Response): Promise<void> {
  let sessionData;
  // 0. Authentication & Authorization Check
  const headers = new Headers();
  Object.entries(req.headers).forEach(([key, value]) => {
    if (value) { headers.append(key, Array.isArray(value) ? value.join(', ') : value); }
  });

  try {
    sessionData = await auth.api.getSession({ headers });
  } catch (authError) {
    console.error(`[Transform Image Handler] Error calling auth.api.getSession:`, authError);
    res.status(500).json({ error: 'Internal server error during authentication check.' });
    return;
  }

  // --- Try assertion with optional chaining --- 
  const userId = (sessionData?.session as any)?.userId as string | undefined;
  // --- End Try assertion --- 

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized: No active session or user ID.' });
    return;
  }
  
  let dbClient;
  let isSubscribedUser = false; // To track if this is a subscribed user transform
  
  try {
    dbClient = await pool.connect();

    // --- Credit Check & Get Subscription Status ---
    const requiredCredits = 10; // Transform costs 10 credits
    let currentCredits = 0;
    // Fetch credits AND subscription status in one query
    const userResult = await dbClient.query('SELECT credits, subscription_active FROM "user" WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
       console.warn(`[Transform Image Handler] User ${userId} not found in users table.`);
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
    console.log(`[Transform Image Handler] User ${userId}${isSubscribedUser ? ' (Subscriber)' : ''} requested transform with prompt: "${prompt}"`);

    // Check if this is a multi-image meme request
    const isAbsoluteCinema = prompt.includes("Take the first face, and put it on the face/meme of absolute cinema");
    const isDisasterGirl = prompt.includes("Take the first face, and put it on the face/meme of the second");
    
    let response;
    if (isAbsoluteCinema || isDisasterGirl) {
      // Handle multi-image meme requests (absolute cinema or disaster girl)
      const memeType = isAbsoluteCinema ? 'absolute cinema' : 'disaster girl';
      console.log(`[Transform Image Handler] Detected ${memeType} request for user ${userId}`);
      
      // 1. Prepare user image from base64 (this will be the FIRST image - the face to transfer)
      const userBase64Parts = imageBase64.match(/^data:(image\/\w+);base64,(.*)$/);
      if (!userBase64Parts || userBase64Parts.length !== 3) {
         res.status(400).json({ error: 'Invalid imageBase64 format.' });
         return; 
      }
      const userImageType = userBase64Parts[1]; 
      const userBase64Data = userBase64Parts[2];
      const userImageBuffer = Buffer.from(userBase64Data, 'base64');
      // Handle different image formats (png, jpeg, jpg)
      const userImage = await toFile(userImageBuffer, 'userFace.png', { type: userImageType }); 

      // 2. Load meme template (this will be the SECOND image - the meme template)
      let templateImage;
      try {
        // Determine which template to use
        const templateFileName = isAbsoluteCinema ? 'absolute-cinema-template.png' : 'disaster-girl-template.png';
        const templatePath = path.join(process.cwd(), templateFileName);
        
        console.log(`[Transform Image Handler] Current working directory: ${process.cwd()}`);
        console.log(`[Transform Image Handler] Looking for ${memeType} template at: ${templatePath}`);
        
        if (fs.existsSync(templatePath)) {
          console.log(`[Transform Image Handler] Found ${memeType} template at: ${templatePath}`);
          // Use fs.createReadStream like in your working example
          templateImage = await toFile(fs.createReadStream(templatePath), templateFileName, { type: 'image/png' });
        } else {
          console.error(`[Transform Image Handler] ${memeType} template image not found at: ${templatePath}`);
          res.status(500).json({ error: `${memeType} template image not found on server. Please check server logs for details.` });
          return;
        }
      } catch (fileError) {
        console.error(`[Transform Image Handler] Error loading ${memeType} template image:`, fileError);
        res.status(500).json({ error: `Error loading ${memeType} template.` });
        return;
      }

      // 3. Call the images.edit endpoint with multiple images (user face first, template second)
      const images = [userImage, templateImage]; // Face first, then meme template
      
      response = await client.images.edit({
        model: "gpt-image-1", 
        image: images,
        prompt: prompt, // Use the exact prompt from stylePrompts
        n: 1,
        size: "1024x1024",
        quality: "high"
      });
    } else {
      // Handle regular single image transform
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
      response = await client.images.edit({
        model: "gpt-image-1", 
        image: preparedImage,
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        quality: "high"
      });
    }

    // 3. Decrement Credits on Success
    try {
      await dbClient.query('UPDATE "user" SET credits = credits - $1 WHERE id = $2', [requiredCredits, userId]);
    } catch (dbError: any) {
       console.error(`[Transform Image Handler] Error decrementing credits for user ${userId}:`, dbError);
       // Continue anyway
    }

    // 4. Handle OpenAI Response (expecting b64_json)
    if (response.data && response.data[0]) {
      const editedBase64 = response.data[0].b64_json;
      if (editedBase64) {
         // Log successful completion
         console.log(`[Transform Image Handler] Successfully transformed image for user ${userId}.`);
         res.json({ editedImageBase64: `data:image/png;base64,${editedBase64}` }); 
      } else {
         const url = response.data[0].url;
         console.error(`[Transform Image Handler] API response missing b64_json for user ${userId}. URL found:`, url || "None");
         res.status(500).json({ error: 'API response did not contain expected image data.' });
      }
    } else {
      console.error(`[Transform Image Handler] Invalid response structure from OpenAI API for user ${userId}:`, response);
      res.status(500).json({ error: 'Invalid response structure from OpenAI API.' });
    }

  } catch (error: any) {
    console.error(`[Transform Image Handler] Error processing image for user ${userId}:`, error);
    const errorMessage = error.response?.data?.error?.message || error.message || "Unknown error occurred";
    const errorStatus = error.response?.status || 500;
    res.status(errorStatus).json({ error: 'Failed to transform image, image format should only be PNG, JPG or WEBP.', details: errorMessage });
  } finally {
    // Ensure database client is always released
    if (dbClient) {
      dbClient.release();
    }
  }
}

// Edit Transformed Image Handler (5 credits)
async function handleEditTransformedImageLogic(req: Request, res: Response): Promise<void> {
  let sessionData;
  // 0. Authentication & Authorization Check
  const headers = new Headers();
  Object.entries(req.headers).forEach(([key, value]) => {
    if (value) { headers.append(key, Array.isArray(value) ? value.join(', ') : value); }
  });

  try {
    sessionData = await auth.api.getSession({ headers });
  } catch (authError) {
    console.error(`[Edit Transformed Image Handler] Error calling auth.api.getSession:`, authError);
    res.status(500).json({ error: 'Internal server error during authentication check.' });
    return;
  }

  // --- Try assertion with optional chaining --- 
  const userId = (sessionData?.session as any)?.userId as string | undefined;
  // --- End Try assertion --- 

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized: No active session or user ID.' });
    return;
  }
  
  let dbClient;
  let isSubscribedUser = false; // To track if this is a subscribed user edit
  
  try {
    dbClient = await pool.connect();

    // --- Credit Check & Get Subscription Status ---
    const requiredCredits = 5; // Edit costs 5 credits
    let currentCredits = 0;
    // Fetch credits AND subscription status in one query
    const userResult = await dbClient.query('SELECT credits, subscription_active FROM "user" WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
       console.warn(`[Edit Transformed Image Handler] User ${userId} not found in users table.`);
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

    // LOG EDIT START (Include subscriber status if applicable)
    console.log(`[Edit Transformed Image Handler] User ${userId}${isSubscribedUser ? ' (Subscriber)' : ''} requested edit with prompt: "${prompt}"`);

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

    // 3. Decrement Credits on Success
    try {
      await dbClient.query('UPDATE "user" SET credits = credits - $1 WHERE id = $2', [requiredCredits, userId]);
    } catch (dbError: any) {
       console.error(`[Edit Transformed Image Handler] Error decrementing credits for user ${userId}:`, dbError);
       // Continue anyway
    }

    // 4. Handle OpenAI Response (expecting b64_json)
    if (response.data && response.data[0]) {
      const editedBase64 = response.data[0].b64_json;
      if (editedBase64) {
         // Log successful completion
         console.log(`[Edit Transformed Image Handler] Successfully edited transformed image for user ${userId}.`);
         res.json({ editedImageBase64: `data:image/png;base64,${editedBase64}` }); 
      } else {
         const url = response.data[0].url;
         console.error(`[Edit Transformed Image Handler] API response missing b64_json for user ${userId}. URL found:`, url || "None");
         res.status(500).json({ error: 'API response did not contain expected image data.' });
      }
    } else {
      console.error(`[Edit Transformed Image Handler] Invalid response structure from OpenAI API for user ${userId}:`, response);
      res.status(500).json({ error: 'Invalid response structure from OpenAI API.' });
    }

  } catch (error: any) {
    console.error(`[Edit Transformed Image Handler] Error processing image for user ${userId}:`, error);
    const errorMessage = error.response?.data?.error?.message || error.message || "Unknown error occurred";
    const errorStatus = error.response?.status || 500;
    res.status(errorStatus).json({ error: 'Failed to edit transformed image, image format should only be PNG, JPG or WEBP.', details: errorMessage });
  } finally {
    // Ensure database client is always released
    if (dbClient) {
      dbClient.release();
    }
  }
}

// Transform Image Endpoint (10 credits) - Wrap the async function call
app.post('/api/transform-image', (req: Request, res: Response) => {
  handleTransformImageLogic(req, res).catch(err => {
    console.error("[Server] Unhandled error in route wrapper for handleTransformImageLogic:", err);
    if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error.' });
    }
  });
});

// Edit Transformed Image Endpoint (5 credits) - Wrap the async function call
app.post('/api/edit-transformed-image', (req: Request, res: Response) => {
  handleEditTransformedImageLogic(req, res).catch(err => {
    console.error("[Server] Unhandled error in route wrapper for handleEditTransformedImageLogic:", err);
    if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error.' });
    }
  });
});

// Absolute Cinema Meme Handler (15 credits)
async function handleAbsoluteCinemaLogic(req: Request, res: Response): Promise<void> {
  let sessionData;
  // 0. Authentication & Authorization Check
  const headers = new Headers();
  Object.entries(req.headers).forEach(([key, value]) => {
    if (value) { headers.append(key, Array.isArray(value) ? value.join(', ') : value); }
  });

  try {
    sessionData = await auth.api.getSession({ headers });
  } catch (authError) {
    console.error(`[Absolute Cinema Handler] Error calling auth.api.getSession:`, authError);
    res.status(500).json({ error: 'Internal server error during authentication check.' });
    return;
  }

  // --- Try assertion with optional chaining --- 
  const userId = (sessionData?.session as any)?.userId as string | undefined;
  // --- End Try assertion --- 

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized: No active session or user ID.' });
    return;
  }
  
  let dbClient;
  let isSubscribedUser = false; // To track if this is a subscribed user transform
  
  try {
    dbClient = await pool.connect();

    // --- Credit Check & Get Subscription Status ---
    const requiredCredits = 10;
    let currentCredits = 0;
    // Fetch credits AND subscription status in one query
    const userResult = await dbClient.query('SELECT credits, subscription_active FROM "user" WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
       console.warn(`[Absolute Cinema Handler] User ${userId} not found in users table.`);
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
    
    const { userImageBase64, absoluteCinemaTemplateBase64 } = req.body;

    // Basic validation
    if (!userImageBase64) {
      res.status(400).json({ error: 'userImageBase64 is required in the request body.' });
      return; 
    }
    if (!userImageBase64.startsWith('data:image/')) {
       res.status(400).json({ error: 'userImageBase64 does not seem to be a valid data URL.'});
       return; 
    }

         // Check if absolute cinema template is provided, otherwise use default
     let absoluteCinemaBase64 = absoluteCinemaTemplateBase64;
     if (!absoluteCinemaBase64) {
       // Load default absolute cinema template from file system
       try {
         const templatePath = path.join(process.cwd(), 'public', 'images', 'absolute-cinema-template.jpg');
         if (fs.existsSync(templatePath)) {
           const templateBuffer = fs.readFileSync(templatePath);
           absoluteCinemaBase64 = `data:image/jpeg;base64,${templateBuffer.toString('base64')}`;
         } else {
           console.error(`[Absolute Cinema Handler] Template image not found at ${templatePath}`);
           res.status(500).json({ error: 'Absolute cinema template image not found on server.' });
           return;
         }
       } catch (fileError) {
         console.error(`[Absolute Cinema Handler] Error loading template image:`, fileError);
         res.status(500).json({ error: 'Error loading absolute cinema template.' });
         return;
       }
     }

    // LOG ABSOLUTE CINEMA START (Include subscriber status if applicable)
    console.log(`[Absolute Cinema Handler] User ${userId}${isSubscribedUser ? ' (Subscriber)' : ''} requested absolute cinema meme transformation`);

    // 1. Prepare images data from base64
    const userBase64Parts = userImageBase64.match(/^data:(image\/\w+);base64,(.*)$/);
    if (!userBase64Parts || userBase64Parts.length !== 3) {
       res.status(400).json({ error: 'Invalid userImageBase64 format.' });
       return; 
    }
    const userImageType = userBase64Parts[1]; 
    const userBase64Data = userBase64Parts[2];
    const userImageBuffer = Buffer.from(userBase64Data, 'base64');
    const userImage = await toFile(userImageBuffer, 'userImage.png', { type: userImageType }); 

    const templateBase64Parts = absoluteCinemaBase64.match(/^data:(image\/\w+);base64,(.*)$/);
    if (!templateBase64Parts || templateBase64Parts.length !== 3) {
       res.status(400).json({ error: 'Invalid absoluteCinemaTemplateBase64 format.' });
       return; 
    }
    const templateImageType = templateBase64Parts[1]; 
    const templateBase64Data = templateBase64Parts[2];
    const templateImageBuffer = Buffer.from(templateBase64Data, 'base64');
    const templateImage = await toFile(templateImageBuffer, 'absoluteCinemaTemplate.png', { type: templateImageType }); 

         // 2. Call the images.edit endpoint with multiple images using gpt-image-1
     const images = [templateImage, userImage]; // Template first (left), user image second (right)
     // Use the prompt from stylePrompts
     const absoluteCinemaPrompt = "Take the face on the right, and put it on the face/meme on the left, so that it looks like the absolute cinema meme, make sure the body and head proportions are right and the skin colors too";
     const prompt = absoluteCinemaPrompt;

    const response = await client.images.edit({
      model: "gpt-image-1", 
      image: images,
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "high"
    });

    // 3. Decrement Credits on Success
    try {
      await dbClient.query('UPDATE "user" SET credits = credits - $1 WHERE id = $2', [requiredCredits, userId]);
    } catch (dbError: any) {
       console.error(`[Absolute Cinema Handler] Error decrementing credits for user ${userId}:`, dbError);
       // Continue anyway
    }

    // 4. Handle OpenAI Response (expecting b64_json)
    if (response.data && response.data[0]) {
      const editedBase64 = response.data[0].b64_json;
      if (editedBase64) {
         // Log successful completion
         console.log(`[Absolute Cinema Handler] Successfully created absolute cinema meme for user ${userId}.`);
         res.json({ editedImageBase64: `data:image/png;base64,${editedBase64}` }); 
      } else {
         const url = response.data[0].url;
         console.error(`[Absolute Cinema Handler] API response missing b64_json for user ${userId}. URL found:`, url || "None");
         res.status(500).json({ error: 'API response did not contain expected image data.' });
      }
    } else {
      console.error(`[Absolute Cinema Handler] Invalid response structure from OpenAI API for user ${userId}:`, response);
      res.status(500).json({ error: 'Invalid response structure from OpenAI API.' });
    }

  } catch (error: any) {
    console.error(`[Absolute Cinema Handler] Error processing absolute cinema meme for user ${userId}:`, error);
    const errorMessage = error.response?.data?.error?.message || error.message || "Unknown error occurred";
    const errorStatus = error.response?.status || 500;
    res.status(errorStatus).json({ error: 'Failed to create absolute cinema meme, image format should only be PNG, JPG or WEBP.', details: errorMessage });
  } finally {
    // Ensure database client is always released
    if (dbClient) {
      dbClient.release();
    }
  }
}

// Absolute Cinema Meme Endpoint (15 credits) - Wrap the async function call
app.post('/api/absolute-cinema', (req: Request, res: Response) => {
  handleAbsoluteCinemaLogic(req, res).catch(err => {
    console.error("[Server] Unhandled error in route wrapper for handleAbsoluteCinemaLogic:", err);
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
