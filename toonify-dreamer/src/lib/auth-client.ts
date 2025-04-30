import { createAuthClient } from "better-auth/react";
import { magicLinkClient } from "better-auth/client/plugins";
import dotenv from "dotenv";

dotenv.config();

// TODO: Change to production URL
export const authClient = createAuthClient({
    baseURL: `${process.env.BETTER_AUTH_URL}/api/auth`,
    plugins: [
        magicLinkClient()
    ]
});
