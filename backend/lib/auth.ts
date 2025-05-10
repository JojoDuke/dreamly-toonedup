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
        
        // --- Add sendVerificationEmail --- 

        // --- Add sendResetPassword --- 
        sendResetPassword: async (
            { user, url, token }: { user: User; url: string; token: string },
            request: any
        ) => {
          console.log(`[Auth] Sending password reset email to ${user.email}`);
          
          try {
             await resend.emails.send({
              from: 'Toonly AI <hey@toonlyai.com>',
              to: user.email,
              subject: 'Reset Your Toonly AI Password',
              // Use the provided template, adjusted for Password Reset
              html: `<body style="margin: 0; padding: 0; background-color: transparent; font-family: 'Sentient', serif; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
                      <tr>
                          <td align="center" style="padding: 40px 0;">
                              <table border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; background-color: #f9f4e3; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); border: 1px solid #d4c8af;">
                                  <!-- Header -->
                                  <tr>
                                      <td align="center" bgcolor="#8B6B47" style="padding: 30px 30px; border-radius: 8px 8px 0 0;">
                                          <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                                              <tr>
                                                  <td valign="middle" style="padding-right: 15px;">
                                                      <img src="${theWizardUrl}" alt="Toonly AI Wizard" width="70" style="display: block; border: 0;">
                                                  </td>
                                                  <td valign="middle">
                                                      <h1 style="margin: 0; color: #f9f4e3; font-size: 28px; font-weight: 700; letter-spacing: -0.5px; font-family: 'Sentient', serif;">Toonly AI</h1>
                                                  </td>
                                              </tr>
                                          </table>
                                      </td>
                                  </tr>
                                  <!-- Content -->
                                  <tr>
                                      <td align="left" style="padding: 40px 30px 20px 30px; color: #614e2e; font-family: 'Sentient', serif;">
                                          <h2 style="margin: 0 0 20px 0; font-size: 20px; line-height: 28px; font-weight: 600; color: #614e2e; font-family: 'Sentient', serif;">Reset Your Password</h2>
                                          <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 24px; color: #614e2e; font-family: 'Sentient', serif;">We received a request to reset your password. Click the button below to set a new password. This link will expire for security reasons.</p>
                                          <!-- Reset Password Button -->
                                          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="min-width: 100%; margin-bottom: 30px;">
                                              <tr>
                                                  <td align="center">
                                                      <table border="0" cellpadding="0" cellspacing="0">
                                                          <tr>
                                                              <td align="center" bgcolor="#8B6B47" style="border-radius: 6px;">
                                                                  <a href="${url}" target="_blank" style="display: inline-block; padding: 16px 36px; font-size: 16px; font-weight: 600; color: #f9f4e3; text-decoration: none; border-radius: 6px; background-color: #8B6B47; box-shadow: 0 2px 4px rgba(139, 107, 71, 0.2); transition: background-color 0.2s ease; font-family: 'Sentient', serif;">Reset Your Password</a>
                                                              </td>
                                                          </tr>
                                                      </table>
                                                  </td>
                                              </tr>
                                          </table>
                                          <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 24px; color: #614e2e; font-family: 'Sentient', serif;">If the button above doesn't work, copy and paste this link into your browser:</p>
                                          <p style="margin: 0 0 24px 0; padding: 12px; background-color: #e9e0cf; border-radius: 4px; font-size: 14px; line-height: 20px; color: #614e2e; word-break: break-all; font-family: 'Sentient', serif;">${url}</p>
                                          <p style="margin: 0; font-size: 14px; line-height: 22px; color: #7d6545; font-family: 'Sentient', serif;">If you didn't request a password reset, you can safely ignore this email.</p>
                                      </td>
                                  </tr>
                                  {/* Footer (Identical) */} 
                                  <tr>
                                      <td align="center" bgcolor="#e9e0cf" style="padding: 24px 30px; border-top: 1px solid #d4c8af; border-radius: 0 0 8px 8px;">
                                           <p style="margin: 0; font-size: 14px; line-height: 22px; color: #7d6545; font-family: 'Sentient', serif;">If you didn't request this email, you can safely ignore it.</p>
                                           <p style="margin: 12px 0 0 0; font-size: 14px; line-height: 22px; color: #7d6545; font-family: 'Sentient', serif;">&copy; ${new Date().getFullYear()} Toonly AI. All rights reserved.</p>
                                      </td>
                                  </tr>
                              </table>
                              {/* Additional Note (Identical) */} 
                              <table border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px;">
                                  <tr>
                                      <td align="center" style="padding: 24px 30px 0 30px;">
                                          <p style="margin: 0; font-size: 13px; line-height: 20px; color: #614e2e; font-family: 'Sentient', serif;">This is an automated email. Please do not reply to this message.</p>
                                      </td>
                                  </tr>
                              </table>
                          </td>
                      </tr>
                  </table>
              </body>`,
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
          request: any
      ) => {
        console.log(`[Auth] Sending verification email to ${user.email}`);
        try {
          await resend.emails.send({
            from: 'Toonly AI <hey@usemidas.app>',
            to: user.email,
            subject: 'Verify Your Email for Toonly AI',
            // Use the provided template, adjusted for Verification
            html: `<body style="margin: 0; padding: 0; background-color: transparent; font-family: 'Sentient', serif; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
                      <tr>
                          <td align="center" style="padding: 40px 0;">
                              <table border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; background-color: #f9f4e3; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); border: 1px solid #d4c8af;">
                                  <!-- Header -->
                                  <tr>
                                      <td align="center" bgcolor="#8B6B47" style="padding: 30px 30px; border-radius: 8px 8px 0 0;">
                                          <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                                              <tr>
                                                  <td valign="middle" style="padding-right: 15px;">
                                                      <img src="${theWizardUrl}" alt="Toonly AI Wizard" width="70" style="display: block; border: 0;">
                                                  </td>
                                                  <td valign="middle">
                                                      <h1 style="margin: 0; color: #f9f4e3; font-size: 28px; font-weight: 700; letter-spacing: -0.5px; font-family: 'Sentient', serif;">Toonly AI</h1>
                                                  </td>
                                              </tr>
                                          </table>
                                      </td>
                                  </tr>
                                  <!-- Content -->
                                  <tr>
                                      <td align="left" style="padding: 40px 30px 20px 30px; color: #614e2e; font-family: 'Sentient', serif;">
                                          <h2 style="margin: 0 0 20px 0; font-size: 20px; line-height: 28px; font-weight: 600; color: #614e2e; font-family: 'Sentient', serif;">Verify Your Email Address</h2>
                                          <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 24px; color: #614e2e; font-family: 'Sentient', serif;">Welcome to Toonly AI! Please click the button below to verify your email address and complete your signup. This link will expire for security reasons.</p>
                                          <!-- Verify Email Button -->
                                          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="min-width: 100%; margin-bottom: 30px;">
                                              <tr>
                                                  <td align="center">
                                                      <table border="0" cellpadding="0" cellspacing="0">
                                                          <tr>
                                                              <td align="center" bgcolor="#8B6B47" style="border-radius: 6px;">
                                                                  <a href="${url}" target="_blank" style="display: inline-block; padding: 16px 36px; font-size: 16px; font-weight: 600; color: #f9f4e3; text-decoration: none; border-radius: 6px; background-color: #8B6B47; box-shadow: 0 2px 4px rgba(139, 107, 71, 0.2); transition: background-color 0.2s ease; font-family: 'Sentient', serif;">Verify Email Address</a>
                                                              </td>
                                                          </tr>
                                                      </table>
                                                  </td>
                                              </tr>
                                          </table>
                                          <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 24px; color: #614e2e; font-family: 'Sentient', serif;">If the button above doesn't work, copy and paste this link into your browser:</p>
                                          <p style="margin: 0 0 24px 0; padding: 12px; background-color: #e9e0cf; border-radius: 4px; font-size: 14px; line-height: 20px; color: #614e2e; word-break: break-all; font-family: 'Sentient', serif;">${url}</p>
                                          <p style="margin: 0; font-size: 14px; line-height: 22px; color: #7d6545; font-family: 'Sentient', serif;">If you didn't sign up for Toonly AI, you can safely ignore this email.</p>
                                      </td>
                                  </tr>
                                  {/* Footer (Identical) */} 
                                  <tr>
                                       <td align="center" bgcolor="#e9e0cf" style="padding: 24px 30px; border-top: 1px solid #d4c8af; border-radius: 0 0 8px 8px;">
                                           <p style="margin: 0; font-size: 14px; line-height: 22px; color: #7d6545; font-family: 'Sentient', serif;">If you didn't request this email, you can safely ignore it.</p>
                                           <p style="margin: 12px 0 0 0; font-size: 14px; line-height: 22px; color: #7d6545; font-family: 'Sentient', serif;">&copy; ${new Date().getFullYear()} Toonly AI. All rights reserved.</p>
                                      </td>
                                  </tr>
                              </table>
                               {/* Additional Note (Identical) */} 
                              <table border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px;">
                                  <tr>
                                      <td align="center" style="padding: 24px 30px 0 30px;">
                                          <p style="margin: 0; font-size: 13px; line-height: 20px; color: #614e2e; font-family: 'Sentient', serif;">This is an automated email. Please do not reply to this message.</p>
                                      </td>
                                  </tr>
                              </table>
                          </td>
                      </tr>
                  </table>
              </body>`,
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
