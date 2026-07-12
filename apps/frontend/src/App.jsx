import { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, Download, Loader2, Play, Pause, Scissors, AlignLeft, Type, SlidersHorizontal, Plus, Move, ChevronDown, ChevronRight } from 'lucide-react';
import { UserButton, useAuth, SignInButton } from '@clerk/react';
import TimelineTrack from './TimelineTrack';
import LandingPage from './LandingPage';

function App() {
  const { getToken, isSignedIn } = useAuth();
  const fileInputRef = useRef(null);
  const [currentView, setCurrentView] = useState('landing');
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const [videoId, setVideoId] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [transcription, setTranscription] = useState(null);
  
  // Customization State
  const [selectedTemplate, setSelectedTemplate] = useState("ClipText Glow");
  const [textColor, setTextColor] = useState("#FFFFFF");
  const [glowColor, setGlowColor] = useState("#4ade80");
  const [fontSize, setFontSize] = useState(90);
  const [posX, setPosX] = useState(50.0); // 0-100%
  const [posY, setPosY] = useState(80.0); // 0-100%
  const [renderMode, setRenderMode] = useState("word"); // "word" or "sentence"
  const [aspectRatio, setAspectRatio] = useState("Original");
  const [language, setLanguage] = useState("auto");
  
  // Caption Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [maxWords, setMaxWords] = useState(1);
  const [minDuration, setMinDuration] = useState(0.0);
  const [linesPerCaption, setLinesPerCaption] = useState("Single");
  
  const [activeTab, setActiveTab] = useState("Templates"); // Templates or Style
  
  const [isExporting, setIsExporting] = useState(false);
  const [exportedUrl, setExportedUrl] = useState(null);

  const videoRef = useRef(null);
  const previewContainerRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(1);

  // Dragging state for text on preview
  const [isDraggingText, setIsDraggingText] = useState(false);

  const templates = [
    "ClipText Glow", "ClipText Shadow", "Classic", "Ali Abdaal", "Hormozi Style",
    "Mr Beast Style 1", "Mr Beast Style 2", "Iman Gadzhi", "Devin Jatho", 
    "Highlighted Word", "Clean Glow Style", "ClipText Clean", "Black Punch", 
    "ClipText Word", "Pixelated Word", "Liquid Glass", "Tabahi", 
    "Deep Glow", "Seedha Saadha", "Thora Cinematic", "Delhi", "Big Reveal"
  ];

  const handleTemplateSelect = (t) => {
    setSelectedTemplate(t);
    // Defaults: White text, black shadow/glow, 90 font size
    let txt = "#FFFFFF";
    let glow = "#000000";
    let fz = 90;

    if (t === "ClipText Glow") { txt = "#00FF00"; glow = "#00FF00"; fz = 90; }
    else if (t === "ClipText Shadow") { txt = "#FFFFFF"; glow = "#000000"; fz = 100; }
    else if (t === "Classic") { txt = "#FFFFFF"; glow = "#000000"; fz = 90; }
    else if (t === "Ali Abdaal") { txt = "#000000"; glow = "#FFFFFF"; fz = 80; }
    else if (t === "Hormozi Style") { txt = "#00FF00"; glow = "#000000"; fz = 100; }
    else if (t === "Mr Beast Style 1") { txt = "#FFFFFF"; glow = "#000000"; fz = 110; }
    else if (t === "Mr Beast Style 2") { txt = "#FFFF00"; glow = "#000000"; fz = 110; }
    else if (t === "Iman Gadzhi") { txt = "#FFFFFF"; glow = "#000000"; fz = 80; }
    else if (t === "Devin Jatho") { txt = "#A855F7"; glow = "#000000"; fz = 90; } // Purple
    else if (t === "Highlighted Word") { txt = "#F59E0B"; glow = "#000000"; fz = 90; } // Amber active
    else if (t === "Clean Glow Style") { txt = "#FFFFFF"; glow = "#FFFFFF"; fz = 80; } // White glow
    else if (t === "ClipText Clean") { txt = "#FFFFFF"; glow = "#000000"; fz = 85; }
    else if (t === "Black Punch") { txt = "#000000"; glow = "#FFFFFF"; fz = 100; } // Will render as black text on white box in ASS/UI
    else if (t === "ClipText Word") { txt = "#FFFFFF"; glow = "#000000"; fz = 90; }
    else if (t === "Pixelated Word") { txt = "#FFFFFF"; glow = "#000000"; fz = 70; }
    else if (t === "Liquid Glass") { txt = "#FFFFFF"; glow = "#000000"; fz = 80; }
    else if (t === "Tabahi") { txt = "#FFFFFF"; glow = "#000000"; fz = 100; }
    else if (t === "Deep Glow") { txt = "#EC4899"; glow = "#DB2777"; fz = 100; } // Pink
    else if (t === "Seedha Saadha") { txt = "#FFFFFF"; glow = "#000000"; fz = 110; }
    else if (t === "Thora Cinematic") { txt = "#FFFFFF"; glow = "#000000"; fz = 60; }
    else if (t === "Delhi") { txt = "#FFFFFF"; glow = "#000000"; fz = 90; }
    else if (t === "Big Reveal") { txt = "#EAB308"; glow = "#000000"; fz = 120; } // Yellow

    setTextColor(txt);
    setGlowColor(glow);
    setFontSize(fz);
  };

  const handleUpload = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) {
       console.warn("No file selected or upload cancelled");
       return;
    }
    setFile(selectedFile);
    setIsUploading(true);

    try {
      const token = await getToken();
      
      // 1. Request presigned URL
      const reqUrlRes = await fetch('/api/upload/request-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          fileName: selectedFile.name,
          contentType: selectedFile.type
        })
      });
      if (!reqUrlRes.ok) throw new Error('Failed to get upload URL');
      const reqUrlData = await reqUrlRes.json();
      const { url, fields, videoId } = reqUrlData;
      
      // 2. Rewrite uploadUrl to use /minio proxy if it points to localhost:9000
      let finalUploadUrl = url;
      if (finalUploadUrl.includes('localhost:9000')) {
        const urlObj = new URL(finalUploadUrl);
        finalUploadUrl = '/minio' + urlObj.pathname + urlObj.search;
      }

      // 3. Upload file to MinIO using Presigned POST FormData
      const formData = new FormData();
      Object.entries(fields).forEach(([k, v]) => formData.append(k, v));
      formData.append('file', selectedFile);

      const uploadRes = await fetch(finalUploadUrl, {
        method: 'POST',
        body: formData
      });
      if (!uploadRes.ok) throw new Error('File upload failed');

      // 4. Confirm upload
      const confirmRes = await fetch('/api/upload/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          videoId,
          language
        })
      });
      if (!confirmRes.ok) throw new Error('Upload confirmation failed');
      const confirmData = await confirmRes.json();
      const jobId = confirmData.jobId;

      // 5. Poll for job completion
      pollJobStatus(jobId, token, videoId);
      
    } catch (err) {
      alert("Failed to process video: " + err.message);
      setIsUploading(false);
    }
  };

  const pollJobStatus = async (jobId, _token, videoId) => {
    try {
      // Get a fresh token each poll since Clerk JWTs are short-lived
      const freshToken = await getToken();
      const res = await fetch(`/api/jobs/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${freshToken}`
        }
      });
      if (!res.ok) throw new Error('Failed to check job status');
      const data = await res.json();
      
      if (data.status === 'COMPLETED') {
        setVideoId(videoId);
        
        // Rewrite videoUrl to use /minio proxy if it points to localhost:9000
        let finalVideoUrl = data.videoUrl;
        if (finalVideoUrl && finalVideoUrl.includes('localhost:9000')) {
           const urlObj = new URL(finalVideoUrl);
           finalVideoUrl = '/minio' + urlObj.pathname + urlObj.search;
        }
        setVideoUrl(finalVideoUrl);
        
        rebuildCaptions(data.result, maxWords, minDuration);
        setIsUploading(false);
      } else if (data.status === 'FAILED') {
        throw new Error('Processing failed: ' + (data.error || 'Unknown error'));
      } else {
        // PENDING or PROCESSING, poll again in 2 seconds
        setTimeout(() => pollJobStatus(jobId, _token, videoId), 2000);
      }
    } catch (err) {
      alert("Job polling failed: " + err.message);
      setIsUploading(false);
    }
  };

  const handleWordChange = (segmentIndex, wordIndex, newText) => {
    const newTranscription = { ...transcription };
    newTranscription.segments[segmentIndex].words[wordIndex].word = newText;
    setTranscription(newTranscription);
  };

  const handleAddWord = (segmentIndex, wordIndex) => {
    const newTranscription = { ...transcription };
    const segment = newTranscription.segments[segmentIndex];
    const prevWord = segment.words[wordIndex];
    
    const start = prevWord.end + 0.1;
    let end = start + 1.0;
    
    if (wordIndex + 1 < segment.words.length) {
       const nextWord = segment.words[wordIndex + 1];
       if (end > nextWord.start) {
          end = nextWord.start - 0.1;
       }
    }
    
    if (start >= end) {
       end = start + 0.5;
    }

    const newWord = {
       word: "new",
       start: start,
       end: end
    };
    
    segment.words.splice(wordIndex + 1, 0, newWord);
    setTranscription(newTranscription);
  };

  const rebuildCaptions = (sourceTrans, mWords, mDuration) => {
    if (!sourceTrans || !sourceTrans.segments) return;
    
    // Flatten all words safely (deep clone to avoid reference bugs)
    let allWords = [];
    sourceTrans.segments.forEach(seg => {
      if (seg.words && Array.isArray(seg.words)) {
         allWords.push(...seg.words.map(w => ({...w})));
      } else {
         allWords.push({
           word: seg.text,
           start: seg.start,
           end: seg.end
         });
      }
    });

    // Sanitize overlapping timestamps (enforce strict monotonic increases to fix UI overlaps and video preview rendering)
    let current_time = 0;
    for (let i = 0; i < allWords.length; i++) {
        // Ensure start is at least current_time
        if (allWords[i].start < current_time) {
            allWords[i].start = current_time;
        }
        
        // Ensure end is at least start + 0.1s
        if (allWords[i].end <= allWords[i].start) {
            allWords[i].end = allWords[i].start + 0.1;
        }
        
        // Ensure it doesn't overlap with the next word's start
        if (i < allWords.length - 1) {
            if (allWords[i].end > allWords[i+1].start) {
                // If the next word starts earlier than this word ends, push the next word's start
                // OR trim this word's end. Trimming is better unless it squishes this word to < 0.1s
                if (allWords[i+1].start - allWords[i].start >= 0.1) {
                    allWords[i].end = allWords[i+1].start;
                } else {
                    // Next word is too early, push it back
                    allWords[i].end = allWords[i].start + 0.1;
                    allWords[i+1].start = allWords[i].end;
                }
            }
        }
        
        current_time = allWords[i].end;
    }

    // Regroup words into new segments
    let newSegments = [];
    let currentSegment = null;

    for (let i = 0; i < allWords.length; i++) {
      const word = allWords[i];
      if (!word) continue;
      
      if (!currentSegment) {
        currentSegment = {
          start: word.start,
          end: word.end,
          text: word.word,
          words: [word]
        };
      } else {
        const durationSoFar = word.end - currentSegment.start;
        const count = currentSegment.words.length;
        
        // Break conditions
        if (count >= mWords || durationSoFar > 10.0) { // max duration cap
          // Check min duration
          const segDuration = currentSegment.end - currentSegment.start;
          if (segDuration >= mDuration) {
             newSegments.push(currentSegment);
             currentSegment = {
               start: word.start,
               end: word.end,
               text: word.word,
               words: [word]
             };
             continue;
          }
        }
        
        // Add to current segment
        currentSegment.words.push(word);
        currentSegment.end = word.end;
        currentSegment.text += " " + word.word;
      }
    }
    
    if (currentSegment) {
      newSegments.push(currentSegment);
    }
    
    setTranscription({ ...sourceTrans, segments: newSegments });
  };

  const handleCreateCaptions = () => {
    rebuildCaptions(transcription, maxWords, minDuration);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const token = await getToken();
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          video_id: videoId,
          transcription: transcription,
          template: selectedTemplate,
          text_color: textColor,
          glow_color: glowColor,
          font_size: parseInt(fontSize),
          pos_x: posX,
          pos_y: posY,
          render_mode: renderMode,
          aspect_ratio: aspectRatio
        })
      });
      if (!res.ok) throw new Error('Export failed to start');
      
      const data = await res.json();
      pollExportJobStatus(data.jobId);
    } catch (err) {
      alert("Export failed: " + err.message);
      setIsExporting(false);
    }
  };

  const pollExportJobStatus = async (jobId) => {
    try {
      const freshToken = await getToken();
      const res = await fetch(`/api/jobs/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${freshToken}`
        }
      });
      if (!res.ok) throw new Error('Failed to check export job status');
      const data = await res.json();
      
      if (data.status === 'COMPLETED') {
        let finalVideoUrl = data.videoUrl;
        if (finalVideoUrl && finalVideoUrl.includes('localhost:9000')) {
           const urlObj = new URL(finalVideoUrl);
           finalVideoUrl = '/minio' + urlObj.pathname + urlObj.search;
        } else if (finalVideoUrl && finalVideoUrl.startsWith('/minio')) {
           // already a relative /minio path
        }

        // Fetch the video blob from the URL
        const videoRes = await fetch(finalVideoUrl);
        const blob = await videoRes.blob();
        const url = URL.createObjectURL(blob);
        setExportedUrl(url);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `captioned_video.mp4`;
        a.click();
        
        setIsExporting(false);
      } else if (data.status === 'FAILED') {
        throw new Error('Export processing failed: ' + (data.error || 'Unknown error'));
      } else {
        // PENDING or PROCESSING, poll again in 2 seconds
        setTimeout(() => pollExportJobStatus(jobId), 2000);
      }
    } catch (err) {
      alert("Export job polling failed: " + err.message);
      setIsExporting(false);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => setDuration(video.duration || 1);
    const updatePlayState = () => setIsPlaying(!video.paused);
    
    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', updateDuration);
    video.addEventListener('play', updatePlayState);
    video.addEventListener('pause', updatePlayState);
    
    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', updateDuration);
      video.removeEventListener('play', updatePlayState);
      video.removeEventListener('pause', updatePlayState);
    };
  }, [videoUrl]);

  // Drag text handlers
  const handleTextMouseDown = (e) => {
    e.stopPropagation();
    setIsDraggingText(true);
  };

  const handleMouseMove = useCallback((e) => {
    if (isDraggingText && previewContainerRef.current) {
      const rect = previewContainerRef.current.getBoundingClientRect();
      let xPct = ((e.clientX - rect.left) / rect.width) * 100;
      let yPct = ((e.clientY - rect.top) / rect.height) * 100;
      xPct = Math.max(0, Math.min(100, xPct));
      yPct = Math.max(0, Math.min(100, yPct));
      setPosX(xPct);
      setPosY(yPct);
    }
  }, [isDraggingText]);

  const handleMouseUp = useCallback(() => {
    setIsDraggingText(false);
  }, []);

  useEffect(() => {
    if (isDraggingText) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingText, handleMouseMove, handleMouseUp]);

  if (currentView === 'landing') {
    return <LandingPage onStart={() => setCurrentView('editor')} />;
  }

  if (!videoUrl) {
    return (
      <>
        {isUploading && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm">
            <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mb-4 drop-shadow-md" />
            <span className="text-slate-200 font-semibold tracking-wide">Transcribing audio using Whisper...</span>
          </div>
        )}
        <div className={`min-h-screen bg-slate-950 bg-gradient-to-br from-slate-900 to-indigo-950 flex flex-col items-center justify-center p-4 ${isUploading ? 'pointer-events-none' : ''}`}>
          <div className="max-w-md w-full bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 text-center shadow-2xl">
            <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
               <Scissors className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">ClipText AI</h1>
            <p className="text-slate-400 mb-6 font-medium">Upload a video to edit captions like a pro.</p>
            
            <div className="mb-6 w-full text-left">
               <label className="block text-slate-400 text-xs font-semibold mb-2 uppercase tracking-wider">Spoken Language</label>
               <select 
                 value={language} 
                 onChange={(e) => setLanguage(e.target.value)}
                 disabled={isUploading}
                 className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 outline-none disabled:opacity-50"
               >
                 <option value="auto">Auto-detect</option>
                 <option value="en">English (Translate to English)</option>
               </select>
            </div>

            {!isSignedIn ? (
               <SignInButton mode="modal">
                 <button className="block w-full border-2 border-dashed border-slate-600 hover:border-indigo-400 hover:bg-indigo-500/10 transition-all rounded-xl p-12 cursor-pointer group text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900">
                    <div className="flex flex-col items-center pointer-events-none">
                      <Upload className="w-12 h-12 text-slate-500 group-hover:text-indigo-400 mb-4 transition-colors" />
                      <span className="text-slate-300 font-semibold tracking-wide">Login to upload video</span>
                    </div>
                 </button>
               </SignInButton>
            ) : (
               <button 
                 onClick={() => fileInputRef.current?.click()}
                 disabled={isUploading}
                 className={`block w-full border-2 border-dashed border-slate-600 hover:border-indigo-400 hover:bg-indigo-500/10 transition-all rounded-xl p-12 cursor-pointer group text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
               >
                 <input type="file" ref={fileInputRef} className="hidden" accept="video/mp4,video/quicktime" onChange={handleUpload} disabled={isUploading} />
                 <div className="flex flex-col items-center pointer-events-none">
                   <Upload className="w-12 h-12 text-slate-500 group-hover:text-indigo-400 mb-4 transition-colors" />
                   <span className="text-slate-300 font-semibold tracking-wide">Click to select video</span>
                 </div>
               </button>
            )}
          </div>
        </div>
      </>
    );
  }

  const previewFontSize = (fontSize / 90) * 2.5 + 'rem';
  
  // Aspect ratio class mapper
  let aspectClass = "aspect-video"; // default fallback
  if (aspectRatio === "9:16") aspectClass = "aspect-[9/16]";
  if (aspectRatio === "16:9") aspectClass = "aspect-video";
  if (aspectRatio === "1:1") aspectClass = "aspect-square";
  if (aspectRatio === "4:5") aspectClass = "aspect-[4/5]";
  if (aspectRatio === "Original") aspectClass = ""; // let video tag determine

  return (
    <div className="h-screen bg-slate-950 text-slate-200 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-6 shrink-0 z-20">
        <div className="font-bold text-2xl tracking-tight text-white flex items-center gap-3">
          <div className="p-1.5 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-lg">
             <Scissors className="w-5 h-5 text-white" /> 
          </div>
          ClipText AI
        </div>
        
        {/* Topbar Aspect Ratio selector */}
        <div className="flex items-center gap-2 bg-slate-800/50 p-1 rounded-lg border border-slate-700 text-sm">
           {["Original", "9:16", "16:9", "1:1", "4:5"].map(ar => (
             <button 
                key={ar}
                onClick={() => setAspectRatio(ar)}
                className={`px-3 py-1.5 rounded-md transition-colors font-medium ${aspectRatio === ar ? 'bg-indigo-500 text-white shadow' : 'text-slate-400 hover:text-white'}`}
             >
                {ar}
             </button>
           ))}
        </div>

        <div className="flex items-center gap-4">
          {exportedUrl && (
             <a href={exportedUrl} download="final_video.mp4" className="text-sm font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-emerald-400/10 px-3 py-1.5 rounded-md transition-colors">
               <Download className="w-4 h-4"/> Download Result
             </a>
          )}
          <button 
            onClick={handleExport}
            disabled={isExporting}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all shadow-lg hover:shadow-indigo-500/25"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {isExporting ? 'Exporting Engine...' : 'Export Final Video'}
          </button>
          <div className="ml-2 flex items-center">
            <UserButton />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar: Captions list & Settings */}
        <aside className="w-[380px] bg-slate-900/90 border-r border-slate-800 flex flex-col overflow-hidden shrink-0 z-10 shadow-xl">
          
          <div className="p-4 border-b border-slate-800 bg-slate-900">
             <button 
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className="w-full flex items-center justify-between text-xs font-bold text-slate-500 hover:text-slate-300 uppercase tracking-wider transition-colors"
             >
                <span className="flex items-center gap-2"><SlidersHorizontal className="w-3.5 h-3.5"/> Caption Settings</span>
                {isSettingsOpen ? <ChevronDown className="w-4 h-4"/> : <ChevronRight className="w-4 h-4"/>}
             </button>
             
             {isSettingsOpen && (
               <div className="space-y-4 mt-4">
                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>Max words per caption</span>
                      <span className="font-mono text-indigo-400">{maxWords} words</span>
                    </div>
                    <input type="range" min="1" max="10" value={maxWords} onChange={(e) => {
                       const val = parseInt(e.target.value);
                       setMaxWords(val);
                       rebuildCaptions(transcription, val, minDuration);
                    }} className="w-full accent-indigo-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>Min duration (seconds)</span>
                      <span className="font-mono text-indigo-400">{minDuration.toFixed(1)}s</span>
                    </div>
                    <input type="range" min="0" max="5" step="0.1" value={minDuration} onChange={(e) => {
                       const val = parseFloat(e.target.value);
                       setMinDuration(val);
                       rebuildCaptions(transcription, maxWords, val);
                    }} className="w-full accent-indigo-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer" />
                  </div>

                  <div className="flex justify-between items-center text-xs">
                     <span className="text-slate-300">Lines per caption</span>
                     <div className="flex gap-2">
                       <label className="flex items-center gap-1 cursor-pointer">
                          <input type="radio" checked={linesPerCaption === "Single"} onChange={() => setLinesPerCaption("Single")} className="accent-indigo-500" />
                          Single
                       </label>
                       <label className="flex items-center gap-1 cursor-pointer">
                          <input type="radio" checked={linesPerCaption === "Double"} onChange={() => setLinesPerCaption("Double")} className="accent-indigo-500" />
                          Double
                       </label>
                     </div>
                  </div>

                  <button 
                    onClick={handleCreateCaptions}
                    className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold py-2 rounded shadow-md transition-colors text-sm flex justify-center items-center gap-2"
                  >
                    Create captions
                  </button>
               </div>
             )}
          </div>

          <div className="p-3 border-b border-slate-800 font-semibold flex items-center justify-between text-slate-100 bg-slate-900/50">
            <span className="flex items-center gap-2 text-sm"><AlignLeft className="w-4 h-4 text-indigo-400" /> Word Timeline</span>
            <span className="text-xs text-slate-500 font-normal">Click + to insert</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {transcription?.segments.map((segment, sIndex) => (
              <div key={sIndex} className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/50 hover:border-slate-600 transition-colors">
                <div className="text-xs text-slate-500 mb-2 font-mono flex items-center justify-between">
                  <span>{segment.start.toFixed(1)}s &rarr; {segment.end.toFixed(1)}s</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/50"></div>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  {segment.words.map((wordObj, wIndex) => {
                    const isActive = currentTime >= wordObj.start && currentTime <= wordObj.end;
                    return (
                      <div key={wIndex} className="flex items-center gap-1">
                        <input 
                          value={wordObj.word}
                          onChange={(e) => handleWordChange(sIndex, wIndex, e.target.value)}
                          className={`bg-transparent border-b-2 ${isActive ? 'border-indigo-400 text-white font-bold scale-105' : 'border-transparent hover:border-slate-600 text-slate-300'} px-1 py-0.5 focus:outline-none focus:border-indigo-400 focus:bg-slate-800 rounded-t min-w-[30px] transition-all text-sm`}
                          style={{ width: `${Math.max(30, wordObj.word.length * 8 + 12)}px` }}
                        />
                        <button 
                          onClick={() => handleAddWord(sIndex, wIndex)}
                          className="text-slate-500 hover:text-indigo-400 p-0.5 bg-slate-800 hover:bg-slate-700 rounded transition-colors"
                          title="Insert word after"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Center: Video Player */}
        <main className="flex-1 bg-black flex flex-col items-center justify-center p-6 relative">
          {/* Dynamic Video Container based on aspect ratio */}
          <div 
             ref={previewContainerRef}
             className={`relative max-h-full max-w-full bg-slate-900 overflow-hidden shadow-2xl ring-1 ring-white/10 group ${aspectClass}`}
             style={{ 
               // For Original, we don't force an aspect ratio, it naturally scales to height.
               // We just ensure it doesn't exceed screen.
               width: aspectRatio === "Original" ? 'auto' : '100%', 
               height: aspectRatio === "Original" ? '100%' : 'auto'
             }}
          >
            <video 
              ref={videoRef}
              src={videoUrl} 
              className="w-full h-full object-contain pointer-events-auto"
              onClick={togglePlay}
            />
            
            {/* Draggable Live Text Overlay Preview */}
            <div 
               className={`absolute flex flex-col pointer-events-auto cursor-move items-center justify-center ${isDraggingText ? 'ring-2 ring-indigo-500 bg-indigo-500/10' : 'hover:ring-1 hover:ring-white/30'} p-2 rounded`}
               style={{ 
                 left: `${posX}%`, 
                 top: `${posY}%`,
                 transform: 'translate(-50%, -50%)',
                 zIndex: 40
               }}
               onMouseDown={handleTextMouseDown}
            >
               <div className="flex flex-wrap gap-x-2 justify-center max-w-lg text-center">
                  {transcription?.segments.map(segment => {
                    const inSegment = currentTime >= segment.start && currentTime <= segment.end;
                    if (!inSegment) return null;

                    return segment.words.map((wordObj, i) => {
                      const wordEnd = (i + 1 < segment.words.length) ? segment.words[i+1].start : wordObj.end;
                      const isWordActive = currentTime >= wordObj.start && currentTime <= wordEnd;
                      
                      if (renderMode === "word" && !isWordActive) return null;

                      let style = { fontSize: previewFontSize, lineHeight: 1.1 };
                      
                      if (selectedTemplate === "ClipText Glow") {
                          style.color = isWordActive ? textColor : '#ffffff';
                          style.textShadow = isWordActive ? `0 0 15px ${glowColor}, 0 0 30px ${glowColor}` : '0 2px 4px rgba(0,0,0,0.8)';
                      } else if (selectedTemplate === "ClipText Shadow") {
                          style.color = isWordActive ? textColor : '#ffffff';
                          style.textShadow = `0 6px 15px ${glowColor}`;
                          style.fontFamily = 'Impact, sans-serif';
                      } else if (selectedTemplate === "Ali Abdaal") {
                          style.color = isWordActive ? textColor : '#777777';
                          style.backgroundColor = isWordActive ? glowColor : 'transparent';
                          style.padding = '0 6px';
                          style.borderRadius = '4px';
                      } else if (selectedTemplate === "Hormozi Style") {
                          style.color = isWordActive ? textColor : '#ffffff';
                          style.fontFamily = 'Impact, sans-serif';
                          style.fontStyle = 'italic';
                          style.textShadow = '0 2px 4px rgba(0,0,0,0.8)';
                      } else if (selectedTemplate === "Mr Beast Style 1" || selectedTemplate === "Mr Beast Style 2") {
                          style.color = isWordActive ? textColor : '#ffffff';
                          style.fontFamily = 'Impact, sans-serif';
                          style.textShadow = `0 4px 0px ${glowColor}, 0 -4px 0px ${glowColor}, 4px 0px 0px ${glowColor}, -4px 0px 0px ${glowColor}`; // Thick outline
                      } else if (selectedTemplate === "Iman Gadzhi") {
                          style.color = isWordActive ? textColor : '#ffffff';
                          style.fontFamily = '"Times New Roman", serif';
                          style.fontWeight = '300';
                          style.textShadow = '0 2px 4px rgba(0,0,0,0.8)';
                      } else if (selectedTemplate === "Devin Jatho") {
                          style.color = isWordActive ? textColor : '#6b7280'; // gray-500
                          style.fontFamily = 'Arial, sans-serif';
                          style.textShadow = '0 2px 4px rgba(0,0,0,0.5)';
                      } else if (selectedTemplate === "Highlighted Word") {
                          style.color = isWordActive ? textColor : '#ffffff';
                          style.fontFamily = 'Arial, sans-serif';
                          style.textShadow = '0 2px 4px rgba(0,0,0,0.8)';
                      } else if (selectedTemplate === "Clean Glow Style") {
                          style.color = isWordActive ? textColor : '#ffffff';
                          style.fontFamily = 'Arial, sans-serif';
                          style.textShadow = isWordActive ? `0 0 15px ${glowColor}, 0 0 25px ${glowColor}` : 'none';
                      } else if (selectedTemplate === "ClipText Clean") {
                          style.color = isWordActive ? textColor : '#e5e7eb'; // gray-200
                          style.fontFamily = 'Arial, sans-serif';
                          style.textShadow = '0 1px 3px rgba(0,0,0,0.3)';
                      } else if (selectedTemplate === "Black Punch") {
                          style.color = isWordActive ? textColor : '#6b7280';
                          if (isWordActive) {
                              style.backgroundColor = glowColor; // White background
                              style.padding = '0px 6px';
                          }
                          style.fontFamily = 'Impact, sans-serif';
                      } else if (selectedTemplate === "ClipText Word") {
                          style.color = isWordActive ? textColor : '#4b5563'; // gray-600
                          style.fontFamily = 'Arial, sans-serif';
                      } else if (selectedTemplate === "Pixelated Word") {
                          style.color = isWordActive ? textColor : '#9ca3af'; // gray-400
                          style.fontFamily = 'Courier New, monospace';
                          style.letterSpacing = '0.1em';
                          style.textTransform = 'uppercase';
                      } else if (selectedTemplate === "Liquid Glass") {
                          style.color = isWordActive ? textColor : '#9ca3af';
                          if (isWordActive) {
                              style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                              style.backdropFilter = 'blur(8px)';
                              style.border = '1px solid rgba(255, 255, 255, 0.3)';
                              style.padding = '2px 12px';
                              style.borderRadius = '9999px';
                          }
                      } else if (selectedTemplate === "Tabahi") {
                          style.color = isWordActive ? textColor : '#ffffff';
                          style.fontFamily = 'Brush Script MT, cursive'; // Placeholder for edgy font
                          style.textShadow = `2px 2px 0px ${glowColor}, -2px -2px 0px ${glowColor}, 2px -2px 0px ${glowColor}, -2px 2px 0px ${glowColor}`;
                          style.fontStyle = 'italic';
                      } else if (selectedTemplate === "Deep Glow") {
                          style.color = isWordActive ? textColor : '#ffffff';
                          style.fontFamily = 'Arial, sans-serif';
                          style.fontWeight = '900';
                          style.textShadow = isWordActive ? `0 0 20px ${glowColor}, 0 0 40px ${glowColor}, 0 0 60px ${glowColor}` : 'none';
                      } else if (selectedTemplate === "Seedha Saadha") {
                          style.color = isWordActive ? textColor : '#ffffff';
                          style.fontFamily = 'Arial, sans-serif';
                          style.fontWeight = '900';
                          if (isWordActive) {
                              style.backgroundColor = glowColor; // Black box
                              style.padding = '4px 8px';
                          }
                      } else if (selectedTemplate === "Thora Cinematic") {
                          style.color = isWordActive ? textColor : '#9ca3af';
                          style.fontFamily = 'Arial, sans-serif';
                          style.fontWeight = '300';
                          style.letterSpacing = '0.2em';
                      } else if (selectedTemplate === "Delhi") {
                          style.color = isWordActive ? textColor : '#d1d5db';
                          style.fontFamily = 'Georgia, serif';
                          style.fontStyle = 'italic';
                          style.textShadow = isWordActive ? '0 0 10px rgba(255,255,255,0.5)' : 'none';
                      } else if (selectedTemplate === "Big Reveal") {
                          style.color = isWordActive ? textColor : '#ffffff';
                          style.fontFamily = 'Impact, sans-serif';
                          style.textShadow = isWordActive ? '0 10px 15px rgba(0,0,0,0.9)' : '0 2px 4px rgba(0,0,0,0.5)';
                      } else {
                          // Default fallback
                          style.color = isWordActive ? textColor : '#ffffff';
                          style.WebkitTextStroke = `1.5px ${glowColor}`;
                          style.textShadow = '0 2px 4px rgba(0,0,0,0.5)';
                      }
                      
                      return (
                        <span key={i} style={style} className={`font-bold uppercase tracking-wide transition-all duration-75 ${isWordActive ? 'scale-110 opacity-100' : 'opacity-80'}`}>
                          {wordObj.word}
                        </span>
                      );
                    });
                  })}
               </div>
               
               {/* Drag Handle Indicator */}
               {isDraggingText && <div className="absolute -top-3 -right-3 bg-indigo-500 text-white rounded-full p-1"><Move className="w-3 h-3"/></div>}
            </div>
            
            {/* Play Button Overlay */}
            {!isPlaying && (
              <button 
                onClick={togglePlay}
                className="absolute inset-0 m-auto w-20 h-20 bg-indigo-600/80 hover:bg-indigo-500 text-white rounded-full flex items-center justify-center backdrop-blur-md shadow-[0_0_40px_rgba(79,70,229,0.3)] transition-transform hover:scale-110 z-30"
              >
                <Play className="w-10 h-10 ml-2" />
              </button>
            )}
          </div>
        </main>

        {/* Right Sidebar: Templates & Styles */}
        <aside className="w-80 bg-slate-900/90 border-l border-slate-800 flex flex-col shrink-0 shadow-xl z-10">
          
          {/* Tabs */}
          <div className="flex border-b border-slate-800">
             <button 
                onClick={() => setActiveTab("Templates")}
                className={`flex-1 py-4 font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${activeTab === "Templates" ? 'text-indigo-400 border-b-2 border-indigo-400 bg-indigo-400/5' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
             >
                <Type className="w-4 h-4" /> Templates
             </button>
             <button 
                onClick={() => setActiveTab("Style")}
                className={`flex-1 py-4 font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${activeTab === "Style" ? 'text-indigo-400 border-b-2 border-indigo-400 bg-indigo-400/5' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
             >
                <SlidersHorizontal className="w-4 h-4" /> Style
             </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
            
            {/* TEMPLATES TAB */}
            {activeTab === "Templates" && (
              <div className="space-y-3">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2">Preset Styles</p>
                {templates.map(t => (
                  <div 
                    key={t}
                    onClick={() => handleTemplateSelect(t)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedTemplate === t ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_20px_rgba(79,70,229,0.15)]' : 'border-slate-700/50 bg-slate-800/30 hover:border-slate-500'}`}
                  >
                    <h3 className={`font-bold text-lg text-center ${t === 'ClipText Glow' ? 'text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.8)]' : t === 'Ali Abdaal' ? 'bg-white text-black inline-block px-2 rounded mx-auto block' : t === 'Editing Skool' ? 'bg-orange-500 text-white inline-block px-2 rounded mx-auto block' : 'text-white drop-shadow-md'}`}>
                      {t}
                    </h3>
                  </div>
                ))}
              </div>
            )}

            {/* STYLE TAB */}
            {activeTab === "Style" && (
              <div className="space-y-6">

                 {/* Render Mode Toggle */}
                 <div>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-3">Lines</p>
                    <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                        <button 
                           onClick={() => setRenderMode("word")}
                           className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition-colors ${renderMode === "word" ? 'bg-indigo-500 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                           1 Word
                        </button>
                        <button 
                           onClick={() => setRenderMode("sentence")}
                           className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition-colors ${renderMode === "sentence" ? 'bg-indigo-500 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                           1 Line (Sentence)
                        </button>
                    </div>
                 </div>

                 {/* Colors */}
                 <div>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-3">Colors</p>
                    <div className="space-y-4 bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
                       <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-300">Text Color</span>
                          <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0" />
                       </div>
                       <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-300">Glow / Background</span>
                          <input type="color" value={glowColor} onChange={(e) => setGlowColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0" />
                       </div>
                    </div>
                 </div>

                 {/* Font Size */}
                 <div>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-3 flex justify-between">
                       <span>Font Size</span>
                       <span className="text-indigo-400">{fontSize}</span>
                    </p>
                    <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
                       <input 
                          type="range" 
                          min="10" max="150" 
                          value={fontSize} 
                          onChange={(e) => setFontSize(e.target.value)}
                          className="w-full accent-indigo-500 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer" 
                       />
                    </div>
                 </div>

                 <div className="text-xs text-slate-500 text-center italic">
                    Tip: You can now drag and drop the text directly on the video player to position it!
                 </div>

              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Bottom: Draggable Timeline Editor with Audio Waveform */}
      <TimelineTrack 
         transcription={transcription}
         setTranscription={setTranscription}
         duration={duration}
         currentTime={currentTime}
         setCurrentTime={setCurrentTime}
         videoRef={videoRef}
         videoFileUrl={videoUrl}
      />
      
    </div>
  );
}

export default App;
