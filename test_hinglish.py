import whisper

model = whisper.load_model("base")
result = model.transcribe(
    "uploads/1ef4a193-ed73-4aba-aa4e-6543b770a4ea.mp4",
    language="en",
    initial_prompt="Mai theek hu, aap kaise ho? Mujhe hinglish likhna pasand hai. Yeh sentence bhi hinglish mein hi hai bhai. Sab kuch hinglish me bolo yaar. Kyonki sabko hindi samajh aati hai.",
    word_timestamps=True
)
print(result["text"])
