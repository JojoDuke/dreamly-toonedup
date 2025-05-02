import { createAuthClient } from "better-auth/react";
import { magicLinkClient } from "better-auth/client/plugins";

// Use Vite's import.meta.env for frontend environment variables
// Use the VITE_ prefixed variable name
const backendApiUrl = import.meta.env.VITE_BETTER_AUTH_URL || '';

export const authClient = createAuthClient({
    // Construct the full auth URL
    baseURL: `${backendApiUrl.replace(/\/$/, '')}/api/auth`, 
    plugins: [
        magicLinkClient()
    ]
});
