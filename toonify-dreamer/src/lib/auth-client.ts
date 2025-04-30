import { createAuthClient } from "better-auth/react";
import { magicLinkClient } from "better-auth/client/plugins";

// Use hardcoded Render backend URL
export const authClient = createAuthClient({
    baseURL: "https://toonify-dreamer.onrender.com/api/auth",
    plugins: [
        magicLinkClient()
    ]
});
