const duration = 10;
const transcription = { segments: [{ words: [{ start: 9, end: 12 }] }] };
const timelineDuration = Math.max(duration || 1, transcription?.segments?.slice(-1)[0]?.words?.slice(-1)[0]?.end || 0) + 1.0;
console.log("Timeline duration:", timelineDuration);
