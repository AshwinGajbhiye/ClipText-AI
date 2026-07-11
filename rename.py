import os

files = [
    "services/video_processor.py",
    "frontend/src/LandingPage.jsx",
    "frontend/src/App.jsx",
    "frontend/index.html"
]

for file_path in files:
    with open(file_path, "r") as f:
        content = f.read()
    
    # Precise replacements to maintain nice naming
    content = content.replace("Captik Glow", "ClipText Glow")
    content = content.replace("Captik Shadow", "ClipText Shadow")
    content = content.replace("Captik Clean", "ClipText Clean")
    content = content.replace("Captik Word", "ClipText Word")
    content = content.replace("Captik Pro", "ClipText AI")
    content = content.replace("Captik", "ClipText AI")
    
    with open(file_path, "w") as f:
        f.write(content)

print("Renamed Captik to ClipText AI successfully.")
