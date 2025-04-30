import { createAuthClient } from "better-auth/react";
import { magicLinkClient } from "better-auth/client/plugins";

// TODO:Change to production URL
export const authClient = createAuthClient({
    baseURL: "https://toonlyai.com/api/auth",
    plugins: [
        magicLinkClient()
    ]
});
