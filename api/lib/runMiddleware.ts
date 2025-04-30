import cors from 'cors';
import { VercelRequest, VercelResponse } from '@vercel/node';

const trustedOrigins = [
  'http://localhost:8080',
  'https://toonlyai.com',
  'https://www.toonlyai.com'
].filter(Boolean) as string[];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests) or from trusted origins
    if (!origin || trustedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
  allowedHeaders: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
};

// Helper function to run middleware (like cors) in a Vercel Function
export function runMiddleware(req: VercelRequest, res: VercelResponse, fn: Function) {
  return new Promise((resolve, reject) => {
    // Cast req/res to any to satisfy the middleware's expected types if needed
    // Vercel req/res might not perfectly match standard Node http types
    fn(req as any, res as any, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

// Create a specific cors middleware instance to use
export const corsMiddleware = cors(corsOptions); 