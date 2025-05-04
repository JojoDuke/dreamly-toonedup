import { betterAuth } from "better-auth";
import { Pool } from "pg";
import dotenv from "dotenv";
import { Resend } from "resend";
import type { User } from "better-auth";

// Use the public URL directly
const theWizardUrl = "https://i.imgur.com/B7ptMnm.png";

//https://i.ibb.co/JfbH12h/Chat-GPT-Image-Apr-3-2025-08-33-33-PM.png

dotenv.config({ path: '.env.local' });

console.log("[auth.ts] Creating database pool for auth...");
const authDbPool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const resend = new Resend(process.env.RESEND_API_KEY); // Initialize Resend once

export const auth = betterAuth({
    baseURL: process.env.BETTER_AUTH_URL,
    advanced: {
        crossSubDomainCookies: {
          enabled: true,
        },
        defaultCookieAttributes: {
          secure: true,
          // httpOnly: true,
          sameSite: "none",
          path: "/",
        },
      },
    trustedOrigins: [
      'http://localhost:8080',
      'https://toonlyai.com',
      'https://www.toonlyai.com'
    ].filter(Boolean) as string[],
    database: authDbPool,
    emailAndPassword: { 
        enabled: true, 
        requireEmailVerification: true, // Require verification before login
        
        

        // --- Add sendResetPassword --- 
        sendResetPassword: async (
            { user, url, token }: { user: User; url: string; token: string },
            request: any
        ) => {
          console.log(`[Auth] Sending password reset email to ${user.email}`);
          // The URL provided by better-auth here likely already contains the token
          // and points to the frontend page specified in the client-side `forgetPassword` call.
          try {
             await resend.emails.send({
              from: 'Toonly AI <hey@usemidas.app>',
              to: user.email,
              subject: 'Reset Your Toonly AI Password',
              html: `
                <p>Someone requested a password reset for your Toonly AI account.</p>
                <p>Click the link below to set a new password:</p>
                <p><a href="${url}">Reset Password</a></p>
                <p>This link will expire shortly. If you didn't request this, please ignore this email.</p>
                <p>Link: ${url}</p> // Show link for copy/paste
              `,
            });
            console.log(`[Auth] Password reset email sent successfully to ${user.email}`);
          } catch (error) {
             console.error(`[Auth] Failed to send password reset email to ${user.email}:`, error);
             // Handle error appropriately
          }
        },
        // Optionally configure password complexity, reset token expiry etc.
        // resetPasswordTokenExpiresIn: 3600, // Example: 1 hour
      }, 
    // --- Add top-level emailVerification block --- 
    emailVerification: {
      sendVerificationEmail: async (
          { user, url, token }: { user: User; url: string; token: string }, 
          request: any // Keep any for now
      ) => {
        console.log(`[Auth] Sending verification email to ${user.email}`);
        try {
          await resend.emails.send({
            from: 'Toonly AI <hey@usemidas.app>',
            to: user.email,
            subject: 'Verify Your Email for Toonly AI',
            html: `
              <p>Welcome to Toonly AI!</p>
              <p>Please click the link below to verify your email address:</p>
              <p><a href="${url}">Verify Email</a></p>
              <p>If you didn't sign up for Toonly AI, you can ignore this email.</p>
              <p>Link: ${url}</p>
            `,
          });
          console.log(`[Auth] Verification email sent successfully to ${user.email}`);
        } catch (error) {
          console.error(`[Auth] Failed to send verification email to ${user.email}:`, error);
        }
      },
      // Optionally configure verification token expiry if needed
      // verificationTokenExpiresIn: 3600 * 24 // Example: 24 hours
    },
    plugins: [ 
       // REMOVE magicLink plugin
       /*
        magicLink({
            expiresIn: 1800,
            sendMagicLink: async ({ email, token, url }, request) => { ... }
        })
        */
    ]
})
