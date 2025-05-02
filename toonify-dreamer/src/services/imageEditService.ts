import { toast } from "sonner";

// Use Vite's import.meta.env for frontend environment variables
// Use the VITE_ prefixed variable name
const BACKEND_BASE_URL = import.meta.env.VITE_BETTER_AUTH_URL || ''; // Provide a default
const API_ENDPOINT = `${BACKEND_BASE_URL.replace(/\/$/, '')}/api/edit-image`;

// Helper function to convert File to Base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

// Shared API call logic
async function callEditApi(imageBase64: string, prompt: string): Promise<string> {
  console.log("[Service] Calling /api/edit-image endpoint...");
  try {
    const response = await fetch(`${BACKEND_BASE_URL}/api/edit-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', 
      body: JSON.stringify({ imageBase64, prompt }),
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json(); 
      } catch (e) {
        // If parsing JSON fails, use status text
        errorData = { error: response.statusText };
      }
      
      console.error("[Service] API Error Response:", errorData);
      // Throw an object with status for better handling in the component
      const error: any = new Error(errorData.error || `HTTP error! Status: ${response.status}`);
      error.status = response.status;
      throw error;
    }

    const data = await response.json();
    console.log("[Service] API Success Response:", data);

    if (!data.editedImageBase64) {
      throw new Error('API response did not contain editedImageBase64.');
    }

    return data.editedImageBase64;

  } catch (error) {
    console.error("[Service] Error calling edit API:", error);
    // Re-throw the error (potentially with status attached) for the component to handle
    throw error; 
  }
}

// Existing function for initial transform with File
async function transformImageWithPrompt(file: File, prompt: string): Promise<string> {
  const imageBase64 = await fileToBase64(file);
  // Now calls the shared logic directly
  return callEditApi(imageBase64, prompt);
}

export const imageEditService = {
  transformImageWithPrompt,
  // Export the shared function directly
  callEditApi, 
}; 