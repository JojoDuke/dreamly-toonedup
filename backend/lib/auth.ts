import { betterAuth } from "better-auth";
import { Pool } from "pg";
import dotenv from "dotenv";
import { magicLink } from "better-auth/plugins";
import { Resend } from "resend";

dotenv.config({ path: '.env.local' });

console.log("[auth.ts] Creating database pool for auth...");
const authDbPool = new Pool({
    connectionString: process.env.DATABASE_URL,
});
export const auth = betterAuth({
    baseURL: process.env.BETTER_AUTH_URL,
    advanced: {
        crossSubDomainCookies: {
          enabled: true,
        },
        cookie: {
          sameSite: "none",
          secure: true,
          path: "/",
        },
        defaultCookieAttributes: {
          secure: true,
          // httpOnly: true,
          sameSite: "none",
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
      }, 
    plugins: [
        magicLink({
            sendMagicLink: async ({ email, token, url }, request) => {
                // send email to user
                console.log(`Sending magic link to ${email} with token ${token} and url ${url}`);
                //console.log("Sending magic link to", email);
                
                /*const resend = new Resend(process.env.RESEND_API_KEY);
                await resend.emails.send({
        from: 'Toonly AI <hey@usemidas.app>',
        to: email,
        subject: 'Your Magic Link to Toonly AI!',
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
                                        <img src="https://i.ibb.co/JfbH12h/Chat-GPT-Image-Apr-3-2025-08-33-33-PM.png" alt="Toonly AI Wizard" width="70" style="display: block; border: 0;">
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
                            <h2 style="margin: 0 0 20px 0; font-size: 20px; line-height: 28px; font-weight: 600; color: #614e2e; font-family: 'Sentient', serif;">Sign in to Toonly AI</h2>
                            <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 24px; color: #614e2e; font-family: 'Sentient', serif;">We've created a magic sign-in link for you. Click the button below to sign in and start using Toonly AI. For security reasons, this link will expire in 5 minutes.</p>
                            
                            <!-- Magic Link Button -->
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="min-width: 100%; margin-bottom: 30px;">
                                <tr>
                                    <td align="center">
                                        <table border="0" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td align="center" bgcolor="#8B6B47" style="border-radius: 6px;">
                                                    <a href="${url}" target="_blank" style="display: inline-block; padding: 16px 36px; font-size: 16px; font-weight: 600; color: #f9f4e3; text-decoration: none; border-radius: 6px; background-color: #8B6B47; box-shadow: 0 2px 4px rgba(139, 107, 71, 0.2); transition: background-color 0.2s ease; font-family: 'Sentient', serif;">Sign In to Toonly AI</a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 24px; color: #614e2e; font-family: 'Sentient', serif;">If the button above doesn't work, copy and paste this link into your browser:</p>
                            
                            <p style="margin: 0 0 24px 0; padding: 12px; background-color: #e9e0cf; border-radius: 4px; font-size: 14px; line-height: 20px; color: #614e2e; word-break: break-all; font-family: 'Sentient', serif;">
                                ${url}
                            </p>
                            
                            <p style="margin: 0; font-size: 14px; line-height: 22px; color: #7d6545; font-family: 'Sentient', serif;">This link expires in 5 minutes for security reasons.</p>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td align="center" bgcolor="#e9e0cf" style="padding: 24px 30px; border-top: 1px solid #d4c8af; border-radius: 0 0 8px 8px;">
                            <p style="margin: 0; font-size: 14px; line-height: 22px; color: #7d6545; font-family: 'Sentient', serif;">
                                If you didn't request this email, you can safely ignore it.
                            </p>
                            <p style="margin: 12px 0 0 0; font-size: 14px; line-height: 22px; color: #7d6545; font-family: 'Sentient', serif;">
                                &copy; 2025 Toonly AI. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
                
                <!-- Additional note about email -->
                <table border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px;">
                    <tr>
                        <td align="center" style="padding: 24px 30px 0 30px;">
                            <p style="margin: 0; font-size: 13px; line-height: 20px; color: #614e2e; font-family: 'Sentient', serif;">
                                This is an automated email. Please do not reply to this message.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>`,
    });
    */
    }
  })
]
})
