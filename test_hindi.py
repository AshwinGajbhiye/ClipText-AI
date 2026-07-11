import whisper

model = whisper.load_model("base")
result = model.transcribe(
    "uploads/1ef4a193-ed73-4aba-aa4e-6543b770a4ea.mp4",
    language="hi",
    initial_prompt="नमस्ते, मैं ठीक हूँ। आप कैसे हैं? यह वाक्य भी हिंदी में ही है।",
    word_timestamps=True
)
print(result["text"])
