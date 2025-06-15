# Absolute Cinema Setup Instructions

## Required Steps:

1. **Save the Template Image**: 
   - Save your absolute cinema template image as `absolute-cinema-template.png` in the `public/images/` directory
   - The file must be in PNG format
   - The file must be named exactly `absolute-cinema-template.png`

2. **How it Works**:
   - When users select "Absolute Cinema" style and click transform, the system automatically detects the special prompt
   - It loads both the user's uploaded image AND the template image
   - Uses OpenAI's multi-image API to combine them according to your specified prompt

3. **Current Implementation**:
   - The prompt is stored in `toonify-dreamer/src/lib/stylePrompts.ts` 
   - The backend detects the absolute cinema prompt and automatically handles multiple images
   - Uses the regular `/api/transform-image` endpoint (no separate endpoint needed)
   - Costs the standard 10 credits (same as other transforms)

4. **Testing**:
   - Upload an image with a face
   - Select "Absolute Cinema" from the style dropdown
   - Click Transform
   - The system should combine your face with the absolute cinema template

## Troubleshooting:

- Make sure the template image exists at `public/images/absolute-cinema-template.png`
- Check the server logs for any "Template image not found" errors
- Ensure the template image is in PNG format, not JPG 