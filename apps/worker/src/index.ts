import { Worker, Job } from 'bullmq';
import { prisma } from '@repo/database';
import { processTranscriptionJob } from './processors/transcription.processor';
import { processExportJob } from './processors/export.processor';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const connection = { url: REDIS_URL, maxRetriesPerRequest: null };

// 1. Transcription Worker
const transcriptionWorker = new Worker(
  'transcription-queue',
  async (job: Job) => {
    console.log(`Picked up transcription job ${job.id}`);
    
    await prisma.processingJob.update({
      where: { id: job.id },
      data: { status: 'PROCESSING', startedAt: new Date() },
    });

    try {
      await processTranscriptionJob(job);
      
      await prisma.processingJob.update({
        where: { id: job.id },
        data: { status: 'COMPLETED', progress: 100, completedAt: new Date() },
      });
      console.log(`Completed transcription job ${job.id}`);
    } catch (error: any) {
      console.error(`Transcription job ${job.id} failed:`, error.message);
      
      await prisma.processingJob.update({
        where: { id: job.id },
        data: { 
          status: 'FAILED', 
          errorMessage: error.message || 'Unknown error occurred',
          completedAt: new Date() 
        },
      });
      throw error; 
    }
  },
  { connection, concurrency: 2 }
);

transcriptionWorker.on('failed', (job: Job | undefined, err: Error) => {
  console.error(`BullMQ Event: Transcription Job ${job?.id} failed with ${err.message}`);
});

// 2. Export Worker
const exportWorker = new Worker(
  'export-queue',
  async (job: Job) => {
    console.log(`Picked up export job ${job.id}`);
    
    await prisma.processingJob.update({
      where: { id: job.id },
      data: { status: 'PROCESSING', startedAt: new Date() },
    });

    try {
      await processExportJob(job);
      
      await prisma.processingJob.update({
        where: { id: job.id },
        data: { status: 'COMPLETED', progress: 100, completedAt: new Date() },
      });
      console.log(`Completed export job ${job.id}`);
    } catch (error: any) {
      console.error(`Export job ${job.id} failed:`, error.message);
      
      await prisma.processingJob.update({
        where: { id: job.id },
        data: { 
          status: 'FAILED', 
          errorMessage: error.message || 'Unknown error occurred',
          completedAt: new Date() 
        },
      });
      throw error; 
    }
  },
  { connection, concurrency: 2 }
);

exportWorker.on('failed', (job: Job | undefined, err: Error) => {
  console.error(`BullMQ Event: Export Job ${job?.id} failed with ${err.message}`);
});

console.log('Workers started and listening to transcription and export queues...');
