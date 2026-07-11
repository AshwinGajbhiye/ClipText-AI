let allWords = [
    { start: 1.0, end: 1.5 },
    { start: 0.9, end: 2.0 },
    { start: 1.9, end: 1.8 }
];

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
            if (allWords[i+1].start - allWords[i].start >= 0.1) {
                allWords[i].end = allWords[i+1].start;
            } else {
                allWords[i].end = allWords[i].start + 0.1;
                allWords[i+1].start = allWords[i].end;
            }
        }
    }
    
    current_time = allWords[i].end;
}
console.log(allWords);
