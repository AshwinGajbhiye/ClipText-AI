import os
import json
from fastapi import FastAPI, UploadFile, File, Form, Body
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import shutil
import uuid
from services.video_processor import transcribe_only, export_video

app = FastAPI(title="Video Captioning API")

# Enable CORS for the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For production, restrict this to your domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
OUTPUT_DIR = "outputs"

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Mount the uploads directory so the frontend can stream the raw video
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.post("/api/transcribe")
async def transcribe_video(file: UploadFile = File(...), language: str = Form("auto")):
    """Uploads the video and returns the transcribed JSON data + video URL."""
    file_extension = file.filename.split(".")[-1]
    unique_id = str(uuid.uuid4())
    unique_filename = f"{unique_id}.{file_extension}"
    input_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    with open(input_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        transcription_data = transcribe_only(input_path, language=language)
        return JSONResponse(content={
            "video_id": unique_id,
            "video_url": f"/uploads/{unique_filename}",
            "transcription": transcription_data
        })
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/export")
async def export_video_endpoint(
    video_id: str = Body(...),
    transcription: dict = Body(...),
    template: str = Body(...),
    text_color: str = Body("#FFFFFF"),
    glow_color: str = Body("#000000"),
    font_size: int = Body(90),
    pos_x: float = Body(50.0), # percentage 0-100
    pos_y: float = Body(80.0), # percentage 0-100
    render_mode: str = Body("word"), # "word" or "sentence"
    aspect_ratio: str = Body("Original") # "Original", "9:16", "16:9", "1:1", "4:5"
):
    """Takes the edited JSON data and burns the final video."""
    # Find the original video
    input_path = None
    for ext in ["mp4", "mov"]:
        path = os.path.join(UPLOAD_DIR, f"{video_id}.{ext}")
        if os.path.exists(path):
            input_path = path
            break
            
    if not input_path:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Original video not found")
        
    output_path = os.path.join(OUTPUT_DIR, f"final_{video_id}.mp4")
    
    try:
        final_video_path = export_video(
            input_video_path=input_path, 
            output_video_path=output_path, 
            transcription=transcription, 
            template=template,
            text_color=text_color,
            glow_color=glow_color,
            font_size=font_size,
            pos_x=pos_x,
            pos_y=pos_y,
            render_mode=render_mode,
            aspect_ratio=aspect_ratio
        )
        return FileResponse(final_video_path, media_type="video/mp4", filename=f"captioned_{video_id}.mp4")
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
