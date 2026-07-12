import { Request, Response } from 'express';
import { prisma } from '@repo/database';
import { exportQueue, ExportJobPayload } from '../services/queue.service';

export const exportVideo = async (req: Request, res: Response) => {
  try {
    const clerkId = req.auth?.userId;
    if (!clerkId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { video_id, ...exportConfig } = req.body;
    
    if (!video_id) {
      return res.status(400).json({ error: 'video_id is required' });
    }

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const video = await prisma.video.findFirst({
      where: { id: video_id, project: { userId: user.id } }
    });

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Create a new ProcessingJob for the export
    const processingJob = await prisma.processingJob.create({
      data: {
        videoId: video.id,
        jobType: 'EXPORT',
        status: 'PENDING',
        progress: 0,
      },
    });

    const payload: ExportJobPayload = {
      jobId: processingJob.id,
      videoId: video.id,
      originalFileKey: video.originalFileKey,
      exportConfig: exportConfig,
    };

    // Add to BullMQ
    await exportQueue.add('export-video', payload, {
      jobId: processingJob.id,
    });

    return res.status(202).json({
      message: 'Export processing started',
      jobId: processingJob.id,
      status: 'PENDING'
    });

  } catch (error) {
    console.error('Error starting export:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
