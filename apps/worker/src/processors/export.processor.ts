import { Job } from 'bullmq';
import { prisma } from '@repo/database';
import { spawn } from 'child_process';
import { createWriteStream, promises as fs } from 'fs';
import path from 'path';
import os from 'os';
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
  forcePathStyle: true
});

export const processExportJob = async (job: Job) => {
  const { jobId, originalFileKey, videoId, exportConfig } = job.data;
  
  const tmpDir = path.join(os.tmpdir(), 'caption-generator');
  await fs.mkdir(tmpDir, { recursive: true });
  
  const ext = originalFileKey.split('.').pop();
  const localInputPath = path.join(tmpDir, `${jobId}_input.${ext}`);
  const localConfigPath = path.join(tmpDir, `${jobId}_config.json`);
  const localOutputPath = path.join(tmpDir, `${jobId}_output.mp4`);

  const updateProgress = throttle(async (progress: number) => {
    await prisma.processingJob.update({
      where: { id: jobId },
      data: { progress },
    });
  }, 2000);

  try {
    // 1. Download Stream for Video
    console.log(`Downloading ${originalFileKey} to ${localInputPath}...`);
    const { Body } = await s3.send(new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: originalFileKey,
    }));
    
    if (!(Body instanceof Readable)) throw new Error('Stream error');
    const writeStream = createWriteStream(localInputPath);
    Body.pipe(writeStream);
    await finished(writeStream);

    // Write export config to a file for Python script
    await fs.writeFile(localConfigPath, JSON.stringify(exportConfig));

    // 2. Spawn Python
    console.log(`Spawning Python process for export ${jobId}...`);
    const pythonProcess = spawn('python', [
      path.resolve(__dirname, '../../../../services/video_processor.py'),
      '--input', localInputPath,
      '--output', localOutputPath,
      '--config', localConfigPath,
      '--mode', 'export'
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

    // 4. Upload Result (Streaming MP4 file to prevent RAM bloat)
    console.log(`Uploading final video to R2 for ${jobId}...`);
    const resultFileKey = `outputs/users/projects/${videoId}/exported_${jobId}.mp4`;
    
    const fileStream = require('fs').createReadStream(localOutputPath);
    
    const upload = new Upload({
      client: s3,
      params: {
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: resultFileKey,
        Body: fileStream,
        ContentType: 'video/mp4',
      },
    });

    await upload.done();

    // Update the job with the final R2 key
    await prisma.processingJob.update({
      where: { id: jobId },
      data: { resultFileKey },
    });
    
    // Also update finalFileKey on the Video record (optional depending on UX, but good for quick access)
    await prisma.video.update({
      where: { id: videoId },
      data: { finalFileKey: resultFileKey }
    });

  } finally {
    updateProgress.cancel();
    console.log(`Cleaning up /tmp files for export ${jobId}...`);
    try {
      await fs.rm(localInputPath, { force: true });
      await fs.rm(localOutputPath, { force: true });
      await fs.rm(localConfigPath, { force: true });
    } catch (cleanupError) {
      console.error(`Failed to cleanup temp files for export ${jobId}:`, cleanupError);
    }
  }
};
