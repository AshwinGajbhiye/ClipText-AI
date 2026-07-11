import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { ClerkExpressRequireAuth, StrictAuthProp } from '@clerk/clerk-sdk-node';
import uploadRoutes from './routes/upload.routes';
import jobsRoutes from './routes/jobs.routes';

declare global {
  namespace Express {
    interface Request extends StrictAuthProp {}
  }
}

const app = express();
const port = process.env.PORT || 3000;

// Security Middlewares
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:5173', process.env.FRONTEND_URL || ''],
  credentials: true,
}));

// Body Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

// Authenticated Routes
// We apply Clerk middleware here, so all /api routes below require auth
app.use('/api', ClerkExpressRequireAuth());
app.use('/api/upload', uploadRoutes);
app.use('/api/jobs', jobsRoutes);

// Global Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  // Specifically catch Clerk Unauthenticated errors
  if (err.message === 'Unauthenticated') {
    return res.status(401).json({ error: 'Unauthenticated' });
  }
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(port, () => {
  console.log(`API Service listening on port ${port}`);
});
