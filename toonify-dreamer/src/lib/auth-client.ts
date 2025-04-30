import { createAuthClient } from "better-auth/react";
import { magicLinkClient } from "better-auth/client/plugins";
import dotenv from "dotenv";
dotenv.config({ path: '.env.local' });

// Use hardcoded Render backend URL
export const authClient = createAuthClient({
    baseURL: `${process.env.BETTER_AUTH_URL}/api/auth`,
    plugins: [
        magicLinkClient()
    ]
});
