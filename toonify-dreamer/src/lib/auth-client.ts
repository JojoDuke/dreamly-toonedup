import { createAuthClient } from "better-auth/react"

const backendApiUrl = import.meta.env.VITE_BETTER_AUTH_URL;

export const authClient = createAuthClient({
    baseURL: `${backendApiUrl.replace(/\/$/, '')}/api/auth`, 
})