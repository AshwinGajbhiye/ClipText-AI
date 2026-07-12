import { Request, Response } from 'express';
import { prisma } from '@repo/database';

export const streamJobStatus = async (req: Request, res: Response) => {
  const clerkId = req.auth?.userId;
  if (!clerkId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { jobId } = req.params;

  // Validate the job exists and belongs to the user
  const job = await prisma.processingJob.findUnique({
    where: { id: jobId },
    include: { video: { include: { project: true } } }
  });

  if (!job) return res.status(404).json({ error: 'Job not found' });
  
  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (job.video.project.userId !== user?.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Setup Server-Sent Events headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send initial state
  res.write(`data: ${JSON.stringify({ status: job.status, progress: job.progress })}\n\n`);

  if (job.status === 'COMPLETED' || job.status === 'FAILED') {
    res.end();
    return;
  }

  // Poll DB periodically (or use Redis Pub/Sub for pure event-driven approach)
  // For simplicity, we poll the DB every 2 seconds matching our worker throttle
  const intervalId = setInterval(async () => {
    try {
      const currentJob = await prisma.processingJob.findUnique({
        where: { id: jobId },
        select: { status: true, progress: true }
      });

      if (!currentJob) {
        clearInterval(intervalId);
        res.end();
        return;
      }

      res.write(`data: ${JSON.stringify(currentJob)}\n\n`);

      if (currentJob.status === 'COMPLETED' || currentJob.status === 'FAILED') {
        clearInterval(intervalId);
        res.end();
      }
    } catch (e) {
      clearInterval(intervalId);
      res.end();
    }
  }, 2000);

  // Handle client disconnect
  req.on('close', () => {
    clearInterval(intervalId);
  });
};

export const getJobStatus = async (req: Request, res: Response) => {
  const clerkId = req.auth?.userId;
  if (!clerkId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { jobId } = req.params;

  const job = await prisma.processingJob.findUnique({
    where: { id: jobId },
    include: { video: { include: { project: true } } }
  });

  if (!job) return res.status(404).json({ error: 'Job not found' });
  
  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (job.video.project.userId !== user?.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const isExport = job.jobType === 'EXPORT';
  const fileKey = isExport ? job.resultFileKey : job.video.originalFileKey;

  res.json({
    id: job.id,
    status: job.status,
    progress: job.progress,
    result: job.transcription,
    videoUrl: fileKey ? `/minio/${process.env.R2_BUCKET_NAME || 'caption-bucket'}/${fileKey}` : null
  });
};
