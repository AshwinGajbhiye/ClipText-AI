export async function uploadVideoDirectlyToR2(
  file: File, 
  projectId: string,
  clerkToken: string
): Promise<string> {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  // 1. Get Presigned POST URL
  const apiResponse = await fetch(`${API_URL}/api/upload/request-url`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${clerkToken}`
    },
    body: JSON.stringify({
      projectId,
      filename: file.name,
      contentType: file.type,
    }),
  });

  if (!apiResponse.ok) {
    const errorBody = await apiResponse.json();
    throw new Error(errorBody.error || 'Failed to get presigned URL');
  }
  
  const { url, fields, videoId } = await apiResponse.json();

  // 2. Construct FormData for R2
  const formData = new FormData();
  
  // Fields MUST be appended BEFORE the file
  Object.entries(fields).forEach(([key, value]) => {
    formData.append(key, value as string);
  });
  
  // Append the actual video file last
  formData.append('file', file);

  // 3. Upload to Cloudflare R2
  const r2Response = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!r2Response.ok) {
    // Attempt to parse XML error from S3/R2
    const errorText = await r2Response.text();
    console.error('R2 Upload Error:', errorText);
    throw new Error('Cloudflare R2 Upload Failed');
  }

  // 4. Confirm Upload and dispatch BullMQ Job
  const confirmResponse = await fetch(`${API_URL}/api/upload/confirm`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${clerkToken}`
    },
    body: JSON.stringify({ videoId }),
  });

  if (!confirmResponse.ok) {
    const errorBody = await confirmResponse.json();
    throw new Error(errorBody.error || 'Failed to confirm upload');
  }

  const { jobId } = await confirmResponse.json();
  return jobId;
}
