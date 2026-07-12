import React, { useRef, useEffect, useState, useCallback } from 'react';

export default function TimelineTrack({ 
  transcription, 
  setTranscription, 
  duration, 
  currentTime, 
  setCurrentTime,
  videoRef,
  videoFileUrl
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const [draggingBlock, setDraggingBlock] = useState(null); // { sIndex, wIndex, type: 'move'|'left'|'right', startX, initialStart, initialEnd }
  
  const [audioData, setAudioData] = useState(null);

  // Fetch and decode audio
  useEffect(() => {
    if (!videoFileUrl) return;
    const fetchAudio = async () => {
      try {
        const response = await fetch(videoFileUrl);
        const arrayBuffer = await response.arrayBuffer();
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        const channelData = audioBuffer.getChannelData(0); // mono
        
        // Downsample to save memory/drawing time (e.g., 2000 buckets)
        const buckets = 2000;
        const bucketSize = Math.floor(channelData.length / buckets);
        const peaks = new Float32Array(buckets);
        for (let i = 0; i < buckets; i++) {
          let max = 0;
          for (let j = 0; j < bucketSize; j++) {
            const val = Math.abs(channelData[i * bucketSize + j]);
            if (val > max) max = val;
          }
          peaks[i] = max;
        }
        setAudioData(peaks);
      } catch (err) {
        console.error("Failed to decode audio waveform", err);
      }
    };
    fetchAudio();
  }, [videoFileUrl]);

  // Draw waveform
  useEffect(() => {
    if (!canvasRef.current || !audioData || !containerRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Resize canvas to its actual CSS size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw green bars
    ctx.fillStyle = '#10b981'; // Tailwind emerald-500
    const barWidth = canvas.width / audioData.length;
    const centerY = canvas.height / 2;
    
    for (let i = 0; i < audioData.length; i++) {
      const peak = audioData[i] * canvas.height * 0.8; // scale up
      const x = i * barWidth;
      const y = centerY - peak / 2;
      ctx.fillRect(x, y, barWidth > 1 ? barWidth - 0.5 : 1, peak);
    }
  }, [audioData, duration]); // redraw if audioData or duration changes

  // Playhead scrubbing
  const handlePlayheadMouseDown = (e) => {
    e.stopPropagation();
    setIsDraggingPlayhead(true);
    if (videoRef.current) {
        videoRef.current.pause();
    }
  };

  const handleTrackMouseDown = (e) => {
    const timelineDuration = getTimelineDuration();
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    const newTime = pct * timelineDuration;
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(newTime, duration);
    }
    setCurrentTime(Math.min(newTime, duration));
    setIsDraggingPlayhead(true);
    if (videoRef.current) {
        videoRef.current.pause();
    }
  };

  // Block dragging logic
  const handleBlockMouseDown = (e, sIndex, wIndex, type) => {
    e.stopPropagation();
    const word = transcription.segments[sIndex].words[wIndex];
    setDraggingBlock({
      sIndex,
      wIndex,
      type,
      startX: e.clientX,
      initialStart: word.start,
      initialEnd: word.end
    });
  };

  const getTimelineDuration = useCallback(() => {
    return Math.max(duration || 1, transcription?.segments?.slice(-1)[0]?.words?.slice(-1)[0]?.end || 0) + 1.0;
  }, [duration, transcription]);

  const handleMouseMove = useCallback((e) => {
    const timelineDuration = getTimelineDuration();
    if (isDraggingPlayhead && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = Math.max(0, Math.min(1, x / rect.width));
      const newTime = pct * timelineDuration;
      setCurrentTime(Math.min(newTime, duration));
      if (videoRef.current) {
        videoRef.current.currentTime = Math.min(newTime, duration);
      }
    } else if (draggingBlock && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const dx = e.clientX - draggingBlock.startX;
      const dTime = (dx / rect.width) * timelineDuration;
      
      // Deep copy to prevent unintended state mutations
      const newTranscription = JSON.parse(JSON.stringify(transcription));
      const sIndex = draggingBlock.sIndex;
      const wIndex = draggingBlock.wIndex;
      const word = newTranscription.segments[sIndex].words[wIndex];

      // Find boundaries to prevent overlaps
      let prevWordEnd = 0;
      if (wIndex > 0) {
        prevWordEnd = newTranscription.segments[sIndex].words[wIndex - 1].end;
      } else if (sIndex > 0) {
        const prevSeg = newTranscription.segments[sIndex - 1];
        if (prevSeg.words.length > 0) {
            prevWordEnd = prevSeg.words[prevSeg.words.length - 1].end;
        }
      }

      let nextWordStart = timelineDuration;
      if (wIndex < newTranscription.segments[sIndex].words.length - 1) {
        nextWordStart = newTranscription.segments[sIndex].words[wIndex + 1].start;
      } else if (sIndex < newTranscription.segments.length - 1) {
        const nextSeg = newTranscription.segments[sIndex + 1];
        if (nextSeg.words.length > 0) {
            nextWordStart = nextSeg.words[0].start;
        }
      }

      if (draggingBlock.type === 'move') {
        const wordDuration = draggingBlock.initialEnd - draggingBlock.initialStart;
        let newStart = draggingBlock.initialStart + dTime;
        newStart = Math.max(prevWordEnd, Math.min(newStart, nextWordStart - wordDuration));
        word.start = newStart;
        word.end = newStart + wordDuration;
      } else if (draggingBlock.type === 'left') {
        let newStart = draggingBlock.initialStart + dTime;
        newStart = Math.max(prevWordEnd, Math.min(newStart, word.end - 0.1)); // min 0.1s duration
        word.start = newStart;
      } else if (draggingBlock.type === 'right') {
        let newEnd = draggingBlock.initialEnd + dTime;
        newEnd = Math.max(word.start + 0.1, Math.min(newEnd, nextWordStart)); // min 0.1s duration
        word.end = newEnd;
      }

      // Sync segment boundary with its words
      if (newTranscription.segments[sIndex].words.length > 0) {
         newTranscription.segments[sIndex].start = newTranscription.segments[sIndex].words[0].start;
         newTranscription.segments[sIndex].end = newTranscription.segments[sIndex].words[newTranscription.segments[sIndex].words.length - 1].end;
      }

      setTranscription(newTranscription);
    }
  }, [isDraggingPlayhead, draggingBlock, duration, transcription, setTranscription, videoRef, setCurrentTime, getTimelineDuration]);

  const handleMouseUp = useCallback(() => {
    setIsDraggingPlayhead(false);
    setDraggingBlock(null);
  }, []);

  useEffect(() => {
    if (isDraggingPlayhead || draggingBlock) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingPlayhead, draggingBlock, handleMouseMove, handleMouseUp]);

  return (
    <div className="h-48 bg-slate-950 border-t border-slate-800 flex flex-col shrink-0 relative overflow-hidden select-none">
       {/* Timeline Track Header */}
       <div className="h-8 bg-slate-900 flex items-center px-4 text-xs font-mono text-slate-400 border-b border-slate-800 shrink-0 shadow-sm z-10">
          {formatTime(currentTime)} / {formatTime(duration)}
       </div>
       
       <div 
         ref={containerRef}
         className="flex-1 relative cursor-text bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHBhdGggZD0iTTAgMGgwdjQwaDB6TTIwIDBoMHY0MGgweiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMWUzYThhIiBzdHJva2Utd2lkdGg9IjEiLz48L3N2Zz4=')]"
         onMouseDown={handleTrackMouseDown}
       >
           {/* Waveform Canvas */}
           <canvas 
             ref={canvasRef} 
             className="absolute bottom-0 left-0 w-full h-1/2 opacity-60 pointer-events-none"
           />

           {/* Blocks container */}
           <div className="absolute top-2 left-0 right-0 h-10 pointer-events-none">
              {transcription?.segments.map((segment, sIndex) => (
                segment.words.map((w, wIndex) => {
                   const timelineDuration = Math.max(duration || 1, transcription?.segments?.slice(-1)[0]?.words?.slice(-1)[0]?.end || 0) + 1.0;
                   const leftPct = (w.start / timelineDuration) * 100;
                   const widthPct = ((w.end - w.start) / timelineDuration) * 100;
                   
                   return (
                     <div 
                       key={sIndex + "-" + wIndex}
                       className="absolute top-0 h-full bg-amber-200/80 backdrop-blur-sm border border-amber-400 rounded-md flex items-center justify-center text-xs font-bold text-slate-900 shadow-md transition-colors hover:bg-amber-300 pointer-events-auto group"
                       style={{ 
                         left: `${leftPct}%`, 
                         width: `${Math.max(widthPct, 0.5)}%`,
                         minWidth: '20px'
                       }}
                       title={w.word}
                     >
                       {/* Left Resize Handle */}
                       <div 
                         className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-black/20 hover:bg-black/50"
                         onMouseDown={(e) => handleBlockMouseDown(e, sIndex, wIndex, 'left')}
                       />
                       
                       {/* Move Area */}
                       <div 
                         className="flex-1 h-full flex items-center justify-center truncate px-2 cursor-grab active:cursor-grabbing"
                         onMouseDown={(e) => handleBlockMouseDown(e, sIndex, wIndex, 'move')}
                       >
                           {w.word}
                       </div>

                       {/* Right Resize Handle */}
                       <div 
                         className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-black/20 hover:bg-black/50"
                         onMouseDown={(e) => handleBlockMouseDown(e, sIndex, wIndex, 'right')}
                       />
                     </div>
                   );
                })
              ))}
           </div>
           
           {/* Playhead */}
           <div 
              className="absolute top-0 bottom-0 w-0.5 bg-yellow-500 z-50 pointer-events-none"
              style={{ left: `${(currentTime / duration) * 100}%` }}
           >
              <div 
                className="absolute top-0 -translate-x-1/2 w-4 h-4 bg-yellow-500 rounded-b-sm cursor-grab active:cursor-grabbing pointer-events-auto flex items-center justify-center"
                onMouseDown={handlePlayheadMouseDown}
              >
                  <div className="w-1.5 h-1.5 bg-slate-900 rounded-full opacity-50"></div>
              </div>
           </div>
       </div>
    </div>
  );
}

function formatTime(seconds) {
  if (isNaN(seconds)) return "00:00";
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  const ms = Math.floor((seconds % 1) * 10).toString();
  return `${m}:${s}.${ms}`;
}
