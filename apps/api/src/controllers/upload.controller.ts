import { Request, Response } from 'express';
import { prisma } from '@repo/database';
import { S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { v4 as uuidv4 } from 'uuid';
import { transcriptionQueue, TranscriptionJobPayload } from '../services/queue.service';

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true
});

export const requestUploadUrl = async (req: Request, res: Response) => {
  try {
    const clerkId = req.auth?.userId; 
    if (!clerkId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { projectId, contentType } = req.body; 
    
    // Map content type to extension securely
    let extension = 'mp4';
    if (contentType === 'video/webm') extension = 'webm';
    else if (contentType === 'video/quicktime') extension = 'mov';
    else if (contentType !== 'video/mp4') {
       return res.status(400).json({ error: 'Unsupported content type' });
    }

    let user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          clerkId,
          email: `${clerkId}@example.com`,
          name: 'Local Dev User'
        }
      });
    }

    let project = await prisma.project.findFirst({
      where: { userId: user.id }
    });
    if (!project) {
      project = await prisma.project.create({
        data: {
          name: 'Default Project',
          userId: user.id
        }
      });
    }

    const fileId = uuidv4();
    const originalFileKey = `uploads/users/${user.id}/projects/${project.id}/${fileId}.${extension}`;

    const video = await prisma.video.create({
      data: {
        projectId: project.id,
        originalFileKey,
        uploadStatus: 'PENDING',
      },
    });

    // Create Presigned POST with content-length-range (e.g., up to 500MB)
    const { url, fields } = await createPresignedPost(s3, {
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: originalFileKey,
      Conditions: [
        ['content-length-range', 0, 500 * 1024 * 1024],
        ['eq', '$Content-Type', contentType]
      ],
      Fields: {
        'Content-Type': contentType
      },
      Expires: 900 // 15 mins
    });

    return res.status(200).json({
      url,
      fields,
      videoId: video.id,
      fileKey: originalFileKey,
    });

  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const confirmUpload = async (req: Request, res: Response) => {
  try {
    const clerkId = req.auth?.userId;
    if (!clerkId) return res.status(401).json({ error: 'Unauthorized' });

    const { videoId } = req.body;

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const video = await prisma.video.findFirst({
      where: { id: videoId, project: { userId: user.id } }
    });

    if (!video) return res.status(404).json({ error: 'Video not found' });
    
    // True Idempotency
    if (video.uploadStatus === 'COMPLETED') {
      const existingJob = await prisma.processingJob.findFirst({
        where: { videoId: video.id, jobType: 'TRANSCRIPTION' },
        orderBy: { createdAt: 'desc' }
      });
      if (existingJob) {
        return res.status(200).json({
          message: 'Upload already confirmed, job exists',
          jobId: existingJob.id,
          status: existingJob.status
        });
      }
    }

    // Database Transaction
    const [updatedVideo, processingJob] = await prisma.$transaction([
      prisma.video.update({
        where: { id: videoId },
        data: { uploadStatus: 'COMPLETED' },
      }),
      prisma.processingJob.create({
        data: {
          videoId: video.id,
          jobType: 'TRANSCRIPTION',
          status: 'PENDING',
          progress: 0,
        },
      })
    ]);

    const payload: TranscriptionJobPayload = {
      jobId: processingJob.id,
      videoId: video.id,
      fileKey: video.originalFileKey,
    };

    await transcriptionQueue.add('transcribe-video', payload, {
      jobId: processingJob.id,
    });

    return res.status(202).json({
      message: 'Processing started',
      jobId: processingJob.id,
      status: 'PENDING'
    });

  } catch (error) {
    console.error('Error confirming upload:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
