# Multi-Image Meme Setup Instructions

## Required Steps:

1. **Save the Template Images**: 
   - Save your absolute cinema template image as `absolute-cinema-template.png` in the `backend/` directory (root level)
   - Save your disaster girl template image as `disaster-girl-template.png` in the `backend/` directory (root level)
   - Both files must be in PNG format
   - Files must be named exactly as specified above

2. **How it Works**:
   - When users select "Absolute Cinema" or "Disaster Girl" style and click transform, the system automatically detects the special prompt
   - It loads both the user's uploaded image AND the appropriate template image
   - Uses OpenAI's multi-image API to combine them according to your specified prompt

3. **Current Implementation**:
   - The prompt is stored in `toonify-dreamer/src/lib/stylePrompts.ts` 
   - The backend detects the absolute cinema prompt and automatically handles multiple images
   - Uses the regular `/api/transform-image` endpoint (no separate endpoint needed)
   - Costs the standard 10 credits (same as other transforms)

4. **Testing**:
   - Upload an image with a face
   - Select "Absolute Cinema" or "Disaster Girl" from the style dropdown
   - Click Transform
   - The system should combine your face with the appropriate meme template

## Troubleshooting:

- Make sure the template images exist at:
  - `backend/absolute-cinema-template.png`
  - `backend/disaster-girl-template.png`
- Check the server logs for any "Template image not found" errors
- Ensure the template images are in PNG format
- Template files should be in the backend root directory, not in subfolders 