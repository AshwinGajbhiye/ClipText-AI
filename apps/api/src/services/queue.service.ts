import { Queue, DefaultJobOptions } from 'bullmq';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const connection = {
  url: REDIS_URL,
  maxRetriesPerRequest: null,
};

const defaultJobOptions: DefaultJobOptions = {
  removeOnComplete: {
    age: 3600,
    count: 1000,
  },
  removeOnFail: {
    age: 24 * 3600 * 7,
  },
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000,
  },
};

export const transcriptionQueue = new Queue('transcription-queue', {
  connection,
  defaultJobOptions,
});

export const exportQueue = new Queue('export-queue', {
  connection,
  defaultJobOptions,
});

export interface TranscriptionJobPayload {
  jobId: string;
  videoId: string;
  fileKey: string;
}

export interface ExportJobPayload {
  jobId: string;
  videoId: string;
  originalFileKey: string;
  exportConfig: Record<string, any>;
}
