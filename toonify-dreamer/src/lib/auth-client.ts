import { createAuthClient } from "better-auth/react";
import { magicLinkClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
    baseURL: "http://localhost:3001/api/auth",
    plugins: [
        magicLinkClient()
    ]
});
