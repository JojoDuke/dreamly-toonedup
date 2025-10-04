from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import os
import base64
import re
from dotenv import load_dotenv
import openai
from typing import Optional, Dict, Any
import asyncpg
import json
from pathlib import Path
from io import BytesIO
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv('.env.local')

app = FastAPI(title="Toonly AI Backend", version="1.0.0")

# CORS setup - same origins as your Node.js backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "https://toonlyai.com", 
        "https://www.toonlyai.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
PORT = 3001
DATABASE_URL = os.getenv("DATABASE_URL")
openai_api_key = os.getenv("OPENAI_API_KEY")

if not openai_api_key:
    logger.error("[server] Error: OPENAI_API_KEY is not set. Exiting.")
    raise ValueError("OPENAI_API_KEY is not set. Exiting.")

try:
    client = openai.OpenAI(api_key=openai_api_key)
    logger.info("[server] OpenAI client initialized successfully")
except Exception as e:
    logger.error(f"[server] Failed to initialize OpenAI client: {e}")
    raise

# Database connection pool
db_pool = None

async def init_db():
    """Initialize PostgreSQL connection pool"""
    global db_pool
    if DATABASE_URL:
        try:
            db_pool = await asyncpg.create_pool(DATABASE_URL)
            logger.info("[Database] PostgreSQL pool created successfully")
        except Exception as e:
            logger.error(f"[Database] Failed to create pool: {e}")
            db_pool = None

async def get_db_connection():
    """Get a database connection from the pool"""
    if db_pool:
        return await db_pool.acquire()
    return None

@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    await init_db()

@app.on_event("shutdown")
async def shutdown_event():
    """Close database pool on shutdown"""
    global db_pool
    if db_pool:
        await db_pool.close()

# Request models
class TransformRequest(BaseModel):
    prompt: str
    imageBase64: str

class EditRequest(BaseModel):
    prompt: str
    imageBase64: str

class AbsoluteCinemaRequest(BaseModel):
    userImageBase64: str
    absoluteCinemaTemplateBase64: Optional[str] = None

# Helper functions
def parse_base64_image(image_base64: str) -> tuple[str, bytes]:
    """Parse base64 image data - equivalent to your Node.js regex parsing"""
    if not image_base64.startswith('data:image/'):
        raise HTTPException(status_code=400, detail="imageBase64 does not seem to be a valid data URL.")
    
    # Equivalent to: imageBase64.match(/^data:(image\/\w+);base64,(.*)$/)
    match = re.match(r'^data:(image/\w+);base64,(.*)$', image_base64)
    if not match:
        raise HTTPException(status_code=400, detail="Invalid imageBase64 format.")
    
    image_type = match.group(1)
    base64_data = match.group(2)
    
    try:
        image_buffer = base64.b64decode(base64_data)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 data.")
    
    return image_type, image_buffer

async def call_openai_transform(image_buffer: bytes, prompt: str, filename: str = "image.png") -> str:
    """Call OpenAI API for single image transformation"""
    try:
        # Create file-like object from bytes
        image_file = BytesIO(image_buffer)
        image_file.name = filename
        
        response = client.images.edit(
            model="gpt-image-1",
            image=image_file,
            prompt=prompt,
            n=1,
            size="1024x1024"
        )
        
        if response.data and response.data[0]:
            edited_base64 = response.data[0].b64_json
            if edited_base64:
                return f"data:image/png;base64,{edited_base64}"
            else:
                raise HTTPException(status_code=500, detail="API response did not contain expected image data.")
        else:
            raise HTTPException(status_code=500, detail="Invalid response structure from OpenAI API.")
            
    except openai.OpenAIError as e:
        logger.error(f"[Transform] OpenAI API error: {e}")
        raise HTTPException(status_code=500, detail=f"OpenAI API error: {str(e)}")
    except Exception as e:
        logger.error(f"[Transform] Unexpected error: {e}")
        raise HTTPException(status_code=500, detail="Failed to transform image, image format should only be PNG, JPG or WEBP.")

async def call_openai_multi_image(images: list[bytes], prompt: str) -> str:
    """Call OpenAI API for multi-image transformation (memes)"""
    try:
        # Create file-like objects from bytes
        image_files = []
        for i, img_buffer in enumerate(images):
            img_file = BytesIO(img_buffer)
            img_file.name = f"image_{i}.png"
            image_files.append(img_file)
        
        response = client.images.edit(
            model="gpt-image-1",
            image=image_files,
            prompt=prompt,
            n=1,
            size="1024x1024"
        )
        
        if response.data and response.data[0]:
            edited_base64 = response.data[0].b64_json
            if edited_base64:
                return f"data:image/png;base64,{edited_base64}"
            else:
                raise HTTPException(status_code=500, detail="API response did not contain expected image data.")
        else:
            raise HTTPException(status_code=500, detail="Invalid response structure from OpenAI API.")
            
    except Exception as e:
        logger.error(f"[Multi-Image Transform] Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create meme.")

def load_template_image(template_name: str) -> bytes:
    """Load meme template from file system"""
    template_path = Path.cwd() / f"{template_name}-template.png"
    
    logger.info(f"[Template] Looking for template at: {template_path}")
    
    if not template_path.exists():
        # Try in backend directory
        template_path = Path.cwd() / "backend" / f"{template_name}-template.png"
        
    if not template_path.exists():
        logger.error(f"[Template] Template not found: {template_name}")
        raise HTTPException(status_code=500, detail=f"{template_name} template image not found on server.")
    
    logger.info(f"[Template] Found template at: {template_path}")
    return template_path.read_bytes()

# API Routes
@app.get("/")
def health_check():
    """Health check endpoint - equivalent to your Node.js root route"""
    return {"message": "Backend server for Image Editing is running!"}

@app.get("/api/user/credits")
async def get_user_credits(request: Request):
    """Get user credits - simplified version without auth"""
    logger.info("[Credits Handler] Received request /api/user/credits")
    
    # For now, using a mock user ID since we don't have auth
    user_id = "test-user-001"
    
    db_client = None
    try:
        # Connect to DB
        db_client = await get_db_connection()
        if not db_client:
            logger.warning("[Credits Handler] No database connection available")
            return {"credits": 0}
        
        logger.info(f"[Credits Handler] Attempting to fetch credits for user: {user_id}")
        
        # Fetch credits
        result = await db_client.fetchrow('SELECT credits FROM "user" WHERE id = $1', user_id)
        
        if not result:
            logger.warning(f"[Credits Handler] User {user_id} not found in user table. Returning 0 credits.")
            return {"credits": 0}
        else:
            current_credits = result['credits']
            logger.info(f"[Credits Handler] Fetched credits for user {user_id}: {current_credits}")
            return {"credits": current_credits}
            
    except Exception as error:
        logger.error(f"[Credits Handler] Error processing request: {error}")
        raise HTTPException(status_code=500, detail="Internal server error fetching credits.")
    finally:
        if db_client and db_pool:
            await db_pool.release(db_client)
            logger.info(f"[Credits Handler] Released DB connection for user {user_id}")

@app.get("/api/user/status")
async def get_user_status(request: Request):
    """Get user subscription status - simplified version without auth"""
    logger.info("[Status Handler] Received request /api/user/status")
    
    # For now, using a mock user ID since we don't have auth
    user_id = "test-user-001"
    
    db_client = None
    try:
        # Connect to DB
        db_client = await get_db_connection()
        if not db_client:
            logger.warning("[Status Handler] No database connection available")
            return {"isSubscribed": False}
        
        logger.info(f"[Status Handler] Attempting to fetch status for user: {user_id}")
        
        # Fetch subscription status
        result = await db_client.fetchrow('SELECT subscription_active FROM "user" WHERE id = $1', user_id)
        
        is_subscribed = False
        if not result:
            logger.warning(f"[Status Handler] User {user_id} not found in user table. Returning isSubscribed: false.")
        else:
            is_subscribed = result['subscription_active'] or False
            logger.info(f"[Status Handler] Fetched status for user {user_id}: isSubscribed={is_subscribed}")
        
        return {"isSubscribed": is_subscribed}
        
    except Exception as error:
        logger.error(f"[Status Handler] Error processing request: {error}")
        raise HTTPException(status_code=500, detail="Internal server error fetching status.")
    finally:
        if db_client and db_pool:
            await db_pool.release(db_client)
            logger.info(f"[Status Handler] Released DB connection for user {user_id}")

@app.post("/api/transform-image")
async def transform_image(request: TransformRequest):
    """Transform image endpoint - NO AUTH, NO CREDITS - completely free"""
    logger.info(f"[Transform Image Handler] Received transform request with prompt: '{request.prompt}'")
    
    try:
        # Basic validation
        if not request.prompt or not request.imageBase64:
            raise HTTPException(status_code=400, detail="Prompt and imageBase64 are required in the request body.")
        
        if not request.imageBase64.startswith('data:image/'):
            raise HTTPException(status_code=400, detail="imageBase64 does not seem to be a valid data URL.")
        
        # Check if this is a multi-image meme request
        is_absolute_cinema = "Take the first face, and put it on the face/meme of absolute cinema" in request.prompt
        is_disaster_girl = "Take the first face, and put it on the face/meme of the second" in request.prompt
        
        if is_absolute_cinema or is_disaster_girl:
            # Handle multi-image meme requests
            meme_type = 'absolute cinema' if is_absolute_cinema else 'disaster girl'
            logger.info(f"[Transform Image Handler] Detected {meme_type} request")
            
            # Parse user image
            image_type, user_image_buffer = parse_base64_image(request.imageBase64)
            
            # Load template
            template_name = 'absolute-cinema' if is_absolute_cinema else 'disaster-girl'
            template_buffer = load_template_image(template_name)
            
            # Call OpenAI with multiple images (user face first, template second)
            images = [user_image_buffer, template_buffer]
            result = await call_openai_multi_image(images, request.prompt)
        else:
            # Regular single image transform
            image_type, image_buffer = parse_base64_image(request.imageBase64)
            result = await call_openai_transform(image_buffer, request.prompt, "inputImage.png")
        
        logger.info(f"[Transform Image Handler] Successfully transformed image")
        return {"editedImageBase64": result}
        
    except HTTPException:
        raise
    except Exception as error:
        logger.error(f"[Transform Image Handler] Error processing image: {error}")
        error_message = str(error) if error else "Unknown error occurred"
        raise HTTPException(status_code=500, detail=f"Failed to transform image, image format should only be PNG, JPG or WEBP. Details: {error_message}")

@app.post("/api/edit-transformed-image")
async def edit_transformed_image(request: EditRequest):
    """Edit transformed image endpoint - NO AUTH, NO CREDITS - completely free"""
    logger.info(f"[Edit Transformed Image Handler] Received edit request with prompt: '{request.prompt}'")
    
    try:
        # Basic validation
        if not request.prompt or not request.imageBase64:
            raise HTTPException(status_code=400, detail="Prompt and imageBase64 are required in the request body.")
        
        if not request.imageBase64.startswith('data:image/'):
            raise HTTPException(status_code=400, detail="imageBase64 does not seem to be a valid data URL.")
        
        # Parse and process image
        image_type, image_buffer = parse_base64_image(request.imageBase64)
        result = await call_openai_transform(image_buffer, request.prompt, "inputImage.png")
        
        logger.info(f"[Edit Transformed Image Handler] Successfully edited transformed image")
        return {"editedImageBase64": result}
        
    except HTTPException:
        raise
    except Exception as error:
        logger.error(f"[Edit Transformed Image Handler] Error processing image: {error}")
        error_message = str(error) if error else "Unknown error occurred"
        raise HTTPException(status_code=500, detail=f"Failed to edit transformed image, image format should only be PNG, JPG or WEBP. Details: {error_message}")

@app.post("/api/absolute-cinema")
async def absolute_cinema(request: AbsoluteCinemaRequest):
    """Absolute Cinema Meme endpoint - NO AUTH, NO CREDITS - completely free"""
    logger.info(f"[Absolute Cinema Handler] Received absolute cinema meme request")
    
    try:
        # Basic validation
        if not request.userImageBase64:
            raise HTTPException(status_code=400, detail="userImageBase64 is required in the request body.")
        
        if not request.userImageBase64.startswith('data:image/'):
            raise HTTPException(status_code=400, detail="userImageBase64 does not seem to be a valid data URL.")
        
        # Parse user image
        user_image_type, user_image_buffer = parse_base64_image(request.userImageBase64)
        
        # Handle template
        if request.absoluteCinemaTemplateBase64:
            # Use provided template
            template_type, template_buffer = parse_base64_image(request.absoluteCinemaTemplateBase64)
        else:
            # Load default template
            try:
                template_path = Path.cwd() / "public" / "images" / "absolute-cinema-template.jpg"
                if not template_path.exists():
                    template_path = Path.cwd() / "backend" / "absolute-cinema-template.png"
                
                if template_path.exists():
                    template_buffer = template_path.read_bytes()
                    logger.info(f"[Absolute Cinema Handler] Loaded template from {template_path}")
                else:
                    logger.error(f"[Absolute Cinema Handler] Template image not found")
                    raise HTTPException(status_code=500, detail="Absolute cinema template image not found on server.")
            except Exception as file_error:
                logger.error(f"[Absolute Cinema Handler] Error loading template image: {file_error}")
                raise HTTPException(status_code=500, detail="Error loading absolute cinema template.")
        
        # Prepare images (template first/left, user image second/right)
        images = [template_buffer, user_image_buffer]
        
        # Use the specific prompt for absolute cinema
        absolute_cinema_prompt = "Take the face on the right, and put it on the face/meme on the left, so that it looks like the absolute cinema meme, make sure the body and head proportions are right and the skin colors too"
        
        # Call OpenAI with multiple images
        result = await call_openai_multi_image(images, absolute_cinema_prompt)
        
        logger.info(f"[Absolute Cinema Handler] Successfully created absolute cinema meme")
        return {"editedImageBase64": result}
        
    except HTTPException:
        raise
    except Exception as error:
        logger.error(f"[Absolute Cinema Handler] Error processing absolute cinema meme: {error}")
        error_message = str(error) if error else "Unknown error occurred"
        raise HTTPException(status_code=500, detail=f"Failed to create absolute cinema meme, image format should only be PNG, JPG or WEBP. Details: {error_message}")

if __name__ == "__main__":
    # Start server on same port as your Node.js backend
    logger.info(f"[Server] Starting Python server on port {PORT}")
    uvicorn.run(app, host="0.0.0.0", port=PORT)
