import { toast } from "sonner";

// URL of your backend server endpoint
const BACKEND_API_URL = '/api/edit-image'; // Use relative path for Vite proxy

export const imageEditService = {
  // Renamed function and added prompt parameter
  async transformImageWithPrompt(imageFile: File, prompt: string): Promise<string> {
    try {
      console.log('Starting image edit via backend...');
      
      // Convert the image file to base64 data URL
      const base64Image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(imageFile);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
      });

      console.log('Sending request to backend edit endpoint...');
      const response = await fetch(BACKEND_API_URL, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,         // Send the style prompt
          imageBase64: base64Image // Send the base64 data URL
        })
      });

      const responseData = await response.json(); // Always try to parse JSON

      if (!response.ok) {
        console.error('Backend server error:', responseData);
        // Create an error object and attach the status code
        const error: any = new Error(responseData.details || responseData.error || 'Failed to process image via backend');
        error.status = response.status; // Attach the status code
        throw error; // Throw the augmented error
      }

      console.log('Received response from backend:', responseData);

      if (!responseData.editedImageBase64) {
        throw new Error('No editedImageBase64 received from the backend');
      }

      // Return the base64 data URL received from the backend
      return responseData.editedImageBase64;

    } catch (error: any) {
      console.error('Error in imageEditService:', error);

      // The calling component (Index.tsx) will now handle displaying toasts 
      // or modals based on the error status. This service just logs and re-throws.
      
      throw error; // Always re-throw the error for the calling component to handle
    }
  }
}; 