import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';

export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export function useJobStatus(jobId: string | null) {
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const { getToken } = useAuth();

  useEffect(() => {
    if (!jobId) return;

    let eventSource: EventSource | null = null;

    const connectSSE = async () => {
      try {
        const token = await getToken();
        if (!token) return;

        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        
        // Since EventSource doesn't support custom headers natively (like Authorization),
        // we can either pass the token as a query param (if API supports it), 
        // use a polyfill (like event-source-polyfill), or use fetch for streaming.
        // Assuming we update the API to accept ?token= for the SSE endpoint:
        eventSource = new EventSource(`${API_URL}/api/jobs/${jobId}/stream?token=${token}`);

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            setStatus(data.status);
            setProgress(data.progress || 0);

            if (data.status === 'COMPLETED' || data.status === 'FAILED') {
              eventSource?.close();
            }
          } catch (e) {
            console.error('Failed to parse SSE message', e);
          }
        };

        eventSource.onerror = (error) => {
          console.error('SSE Error:', error);
          eventSource?.close();
        };

      } catch (e) {
        console.error('Error connecting to SSE stream:', e);
      }
    };

    connectSSE();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [jobId, getToken]);

  return { status, progress };
}
