import { Job } from 'bullmq';
import { prisma } from '@repo/database';
import { spawn } from 'child_process';
import { createWriteStream, promises as fs } from 'fs';
import path from 'path';
import throttle from 'lodash.throttle';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { Readable } from 'stream';
import { finished } from 'stream/promises';

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export const processTranscriptionJob = async (job: Job) => {
  const { jobId, fileKey, videoId } = job.data;
  
  const tmpDir = '/tmp/caption-generator';
  await fs.mkdir(tmpDir, { recursive: true });
  
  const ext = fileKey.split('.').pop();
  const localInputPath = path.join(tmpDir, `${jobId}_input.${ext}`);
  const localOutputPath = path.join(tmpDir, `${jobId}_output.json`);

  const updateProgress = throttle(async (progress: number) => {
    await prisma.processingJob.update({
      where: { id: jobId },
      data: { progress },
    });
  }, 2000);

  try {
    // 1. Download Stream
    console.log(`Downloading ${fileKey} to ${localInputPath}...`);
    const { Body } = await s3.send(new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: fileKey,
    }));
    
    if (!(Body instanceof Readable)) throw new Error('Stream error');
    const writeStream = createWriteStream(localInputPath);
    Body.pipe(writeStream);
    await finished(writeStream);

    // 2. Spawn Python
    console.log(`Spawning Python process for transcription ${jobId}...`);
    const pythonProcess = spawn('python3', [
      path.resolve(__dirname, '../../../../services/video_processor.py'),
      '--input', localInputPath,
      '--output', localOutputPath,
      '--mode', 'transcribe'
    ]);

    // 3. IPC & Logging
    await new Promise<void>((resolve, reject) => {
      let stderrBuffer: string[] = [];
      const MAX_STDERR_LENGTH = 10000;

      pythonProcess.stdout.on('data', (data) => {
        const output = data.toString();
        try {
          const lines = output.split('\n');
          for (const line of lines) {
            if (line.includes('{"progress":')) {
              const parsed = JSON.parse(line);
              if (parsed.progress) updateProgress(parsed.progress);
            }
          }
        } catch (e) {}
      });

      pythonProcess.stderr.on('data', (data) => {
        const chunk = data.toString();
        stderrBuffer.push(chunk);
        // Maintain rolling buffer roughly around MAX_STDERR_LENGTH
        let currentLength = stderrBuffer.reduce((acc, str) => acc + str.length, 0);
        while (currentLength > MAX_STDERR_LENGTH && stderrBuffer.length > 1) {
          currentLength -= stderrBuffer.shift()!.length;
        }
      });

      pythonProcess.on('close', async (code) => {
        if (code === 0) resolve();
        else {
          const errorMessage = `Python process exited with code ${code}`;
          await prisma.processingLog.create({
            data: {
              jobId,
              level: 'ERROR',
              message: errorMessage,
              metadata: { stderr: stderrBuffer.join(''), exitCode: code }
            }
          });
          reject(new Error(errorMessage));
        }
      });
    });

    // 4. Upload Result (Streaming JSON file)
    console.log(`Uploading output to R2 for ${jobId}...`);
    const resultFileKey = `outputs/users/projects/${videoId}/transcription_${jobId}.json`;
    
    const fileStream = require('fs').createReadStream(localOutputPath);
    
    const upload = new Upload({
      client: s3,
      params: {
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: resultFileKey,
        Body: fileStream,
        ContentType: 'application/json',
      },
    });

    await upload.done();

    // Small JSON, safe to parse for DB storage
    const fileContent = await fs.readFile(localOutputPath);
    await prisma.processingJob.update({
      where: { id: jobId },
      data: { 
        resultFileKey,
        transcription: JSON.parse(fileContent.toString())
      },
    });

  } finally {
    updateProgress.cancel();
    console.log(`Cleaning up /tmp files for ${jobId}...`);
    try {
      await fs.rm(localInputPath, { force: true });
      await fs.rm(localOutputPath, { force: true });
    } catch (cleanupError) {
      console.error(`Failed to cleanup temp files for ${jobId}:`, cleanupError);
    }
  }
};
