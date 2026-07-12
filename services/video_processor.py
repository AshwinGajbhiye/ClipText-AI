import os
import subprocess
import whisper
from fastapi import HTTPException
import uuid
import ssl

# Fix for Mac SSL Certificate error when downloading Whisper weights
try:
    _create_unverified_https_context = ssl._create_unverified_context
except AttributeError:
    pass
else:
    ssl._create_default_https_context = _create_unverified_https_context

def format_time(seconds):
    """Convert seconds to ASS time format: H:MM:SS.cs"""
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    cs = int((seconds - int(seconds)) * 100)
    return f"{h}:{m:02d}:{s:02d}.{cs:02d}"

def hex_to_ass_color(hex_color):
    """Convert HTML hex color (#RRGGBB) to ASS color format (&H00BBGGRR)"""
    hex_color = hex_color.lstrip('#')
    if len(hex_color) == 6:
        r = hex_color[0:2]
        g = hex_color[2:4]
        b = hex_color[4:6]
        return f"&H00{b}{g}{r}"
    return "&H00FFFFFF"

def generate_ass_file(transcription, ass_path, font="Arial", size=90, color="#FFFFFF", position="bottom"):
    """Generate an Advanced SubStation Alpha (.ass) file with word-by-word animation."""
    
    ass_color = hex_to_ass_color(color)
    
    # Map position to ASS alignment (bottom=2, middle=5, top=8)
    align_map = {"bottom": 2, "middle": 5, "top": 8}
    alignment = align_map.get(position.lower(), 2)

    # Dynamic margin depending on alignment
    margin_v = 150 if alignment == 2 else (100 if alignment == 8 else 0)
    
    # Basic styling for bold, centered text with a dark outline (ClipText AI style)
    ass_header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{font},{size},{ass_color},&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,5,0,{alignment},10,10,{margin_v},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    
    with open(ass_path, "w", encoding="utf-8") as f:
        f.write(ass_header)
        
        # We will loop through segments and words
        for segment in transcription.get("segments", []):
            words = segment.get("words", [])
            for word_info in words:
                start_time = format_time(word_info["start"])
                end_time = format_time(word_info["end"])
                text = word_info["word"].strip().upper()
                
                # Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
                line = f"Dialogue: 0,{start_time},{end_time},Default,,0,0,0,,{text}\n"
                f.write(line)

def transcribe_only(input_video_path: str, language: str = "auto") -> dict:
    """Extracts audio and returns the raw Whisper transcription JSON data."""
    # 1. Extract audio
    audio_path = input_video_path + ".wav"
    try:
        subprocess.run([
            "ffmpeg", "-i", input_video_path, "-q:a", "0", "-map", "a", audio_path, "-y"
        ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except subprocess.CalledProcessError as e:
        raise Exception(f"Failed to extract audio: {e}")

    # 2. Transcribe
    print("Loading Whisper model...")
    model = whisper.load_model("base")
    print(f"Transcribing (language={language})...")
    
    whisper_lang = "hi" if language.lower() == "hinglish" else language
    if whisper_lang and whisper_lang.lower() != "auto":
        kwargs = {"word_timestamps": True, "language": whisper_lang}
        if whisper_lang.lower() == "hi":
            # Force Devanagari script to avoid hallucinating Urdu/Tamil/English
            kwargs["initial_prompt"] = "नमस्ते, मैं ठीक हूँ। आप कैसे हैं? यह वाक्य भी हिंदी में ही है।"
        result = model.transcribe(audio_path, **kwargs)
    else:
        result = model.transcribe(audio_path, word_timestamps=True)
        
    if language.lower() == "hinglish":
        try:
            from indic_transliteration import sanscript
            from indic_transliteration.sanscript import transliterate
            import re
            
            def to_hinglish(devanagari_text):
                itrans = transliterate(devanagari_text, sanscript.DEVANAGARI, sanscript.ITRANS)
                clean = itrans.replace('A', 'a').replace('I', 'i').replace('U', 'u').replace('RRi', 'ri').replace('RRI', 'ri')
                clean = clean.replace('LLi', 'li').replace('LLI', 'li').replace('M', 'n').replace('H', 'h').replace('Sh', 'sh')
                clean = clean.replace('shh', 'sh').replace('ch', 'ch').replace('chh', 'chh').replace('JN', 'n').replace('~N', 'n')
                clean = clean.replace('N', 'n').replace('T', 't').replace('Th', 'th').replace('D', 'd').replace('Dh', 'dh')
                clean = clean.replace('S', 's').lower()
                clean = re.sub(r'[^a-z0-9\s\,\.\?\!]', '', clean)
                return clean
            
            result["text"] = to_hinglish(result.get("text", ""))
            for seg in result.get("segments", []):
                seg["text"] = to_hinglish(seg.get("text", ""))
                for word_info in seg.get("words", []):
                    word_info["word"] = to_hinglish(word_info.get("word", ""))
        except ImportError:
            print("indic_transliteration not installed. Returning raw Hindi.")
            
    return result

def generate_ass_from_template(transcription, ass_path, template="Classic", text_color="#FFFFFF", glow_color="#000000", font_size=90, pos_x=50.0, pos_y=80.0, render_mode="word", target_w=1080, target_h=1920):
    """Generates the ASS file based on predefined templates and exact coordinates."""
    
    ass_text_color = hex_to_ass_color(text_color)
    ass_glow_color = hex_to_ass_color(glow_color)

    # Convert percentage to absolute ASS coordinates
    abs_x = (pos_x / 100.0) * target_w
    abs_y = (pos_y / 100.0) * target_h
    
    # Template configurations
    # We will build style_line based on the template logic.
    font_name = "Arial"
    primary_color = ass_text_color
    outline_color = "&H00000000"
    back_color = "&H00000000"
    bold = -1
    italic = 0
    border_style = 1
    outline = 0
    shadow = 0
    
    angle = 0
    spacing = 0

    if template == "ClipText Glow":
        outline_color = ass_glow_color
        outline = 15
        shadow = 5
    elif template == "ClipText Shadow":
        font_name = "Impact"
        back_color = ass_glow_color
        shadow = 8
    elif template == "Ali Abdaal":
        primary_color = "&H00000000"
        back_color = "&H00FFFFFF"
        border_style = 3
    elif template == "Hormozi Style":
        font_name = "Impact"
        primary_color = "&H0000FF00"
        italic = -1
        outline_color = "&H00000000"
        outline = 3
    elif template == "Mr Beast Style 1":
        font_name = "Impact"
        outline_color = ass_glow_color
        outline = 8
        shadow = 4
    elif template == "Mr Beast Style 2":
        font_name = "Impact"
        outline_color = ass_glow_color
        outline = 8
        shadow = 4
    elif template == "Iman Gadzhi":
        font_name = "Times New Roman"
        bold = 0
        shadow = 2
    elif template == "Devin Jatho":
        font_name = "Arial"
        shadow = 2
    elif template == "Highlighted Word":
        font_name = "Arial"
        shadow = 2
    elif template == "Clean Glow Style":
        font_name = "Arial"
        outline_color = ass_glow_color
        outline = 15
        shadow = 0
    elif template == "ClipText Clean":
        font_name = "Arial"
        shadow = 1
    elif template == "Black Punch":
        font_name = "Impact"
        # Since libass border_style=3 (Opaque box) uses OutlineColour for the box background
        border_style = 3
        outline_color = ass_glow_color
    elif template == "ClipText Word":
        font_name = "Arial"
    elif template == "Pixelated Word":
        font_name = "Courier New"
        spacing = 5
    elif template == "Liquid Glass":
        font_name = "Arial"
        border_style = 3
        outline_color = "&H55FFFFFF" # Semi transparent white box
    elif template == "Tabahi":
        font_name = "Brush Script MT" # Or any edgy font installed on the system
        italic = -1
        outline_color = ass_glow_color
        outline = 5
    elif template == "Deep Glow":
        font_name = "Arial"
        outline_color = ass_glow_color
        outline = 20
        shadow = 0
    elif template == "Seedha Saadha":
        font_name = "Arial"
        border_style = 3
        outline_color = ass_glow_color
    elif template == "Thora Cinematic":
        font_name = "Arial"
        bold = 0
        spacing = 15
    elif template == "Delhi":
        font_name = "Georgia"
        italic = -1
        outline_color = ass_glow_color
        outline = 5
    elif template == "Big Reveal":
        font_name = "Impact"
        shadow = 8
        back_color = "&H00000000"
    else:
        # Default
        outline_color = ass_glow_color
        outline = 5

    # Alignment is 5 (Center Middle) so that pos(x,y) anchors the text at its exact center.
    style_line = f"Style: Default,{font_name},{font_size},{primary_color},&H000000FF,{outline_color},{back_color},{bold},{italic},0,0,100,100,{spacing},{angle},{border_style},{outline},{shadow},5,0,0,0,1"

    ass_header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {target_w}
PlayResY: {target_h}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
{style_line}

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    
    with open(ass_path, "w", encoding="utf-8") as f:
        f.write(ass_header)
        
        segments = transcription.get("segments", [])
        total_segments = len(segments)
        
        for idx, segment in enumerate(segments):
            if total_segments > 0:
                progress = int((idx / total_segments) * 50) + 10 # 10% to 60% for ASS generation
                print(f'{{"progress": {progress}}}', flush=True)
                
            words = segment.get("words", [])
            if not words: continue
            
            if render_mode == "sentence":
                hl_color = ass_glow_color
                for i, active_word in enumerate(words):
                    start_time = format_time(active_word["start"])
                    # Extend end_time to next word's start to prevent flickering
                    if i + 1 < len(words):
                        end_time = format_time(words[i+1]["start"])
                    else:
                        end_time = format_time(active_word["end"])
                    
                    text_parts = []
                    for j, w in enumerate(words):
                        word_text = w["word"].strip().upper()
                        if j == i:
                            text_parts.append(f"{{\\c{hl_color}}}{word_text}{{\\r}}")
                        else:
                            text_parts.append(word_text)
                    
                    full_text = " ".join(text_parts)
                    line = f"Dialogue: 0,{start_time},{end_time},Default,,0,0,0,,{{\\pos({abs_x:.1f},{abs_y:.1f})}}{full_text}\n"
                    f.write(line)
            else:
                for i, word_info in enumerate(words):
                    start_time = format_time(word_info["start"])
                    # Extend end_time to next word's start to prevent flickering
                    if i + 1 < len(words):
                        end_time = format_time(words[i+1]["start"])
                    else:
                        end_time = format_time(word_info["end"])
                        
                    text = word_info["word"].strip().upper()
                    line = f"Dialogue: 0,{start_time},{end_time},Default,,0,0,0,,{{\\pos({abs_x:.1f},{abs_y:.1f})}}{text}\n"
                    f.write(line)

def export_video(input_video_path: str, output_video_path: str, transcription: dict, template: str = "Classic", text_color="#FFFFFF", glow_color="#000000", font_size=90, pos_x=50.0, pos_y=80.0, render_mode="word", aspect_ratio="Original", quality="1080p", fit_mode="crop") -> str:
    """Takes the edited transcription and template, generates subtitles, and burns them into the video."""
    
    # Determine target resolution for padding/scaling based on quality
    scale_factor = 1.0 # 1080p base
    if quality == "720p":
        scale_factor = 720 / 1080.0
    elif quality == "4K":
        scale_factor = 2160 / 1080.0
        
    target_w, target_h = None, None
    if aspect_ratio == "9:16":
        target_w, target_h = int(1080 * scale_factor), int(1920 * scale_factor)
    elif aspect_ratio == "16:9":
        target_w, target_h = int(1920 * scale_factor), int(1080 * scale_factor)
    elif aspect_ratio == "1:1":
        target_w, target_h = int(1080 * scale_factor), int(1080 * scale_factor)
    elif aspect_ratio == "4:5":
        target_w, target_h = int(1080 * scale_factor), int(1350 * scale_factor)

    # Ensure even dimensions for FFmpeg
    if target_w: target_w = target_w if target_w % 2 == 0 else target_w + 1
    if target_h: target_h = target_h if target_h % 2 == 0 else target_h + 1

    vf_filters = []
    
    if target_w and target_h:
        if fit_mode == "crop":
            vf_filters.append(f"scale={target_w}:{target_h}:force_original_aspect_ratio=increase,crop={target_w}:{target_h}")
        else:
            vf_filters.append(f"scale={target_w}:{target_h}:force_original_aspect_ratio=decrease,pad={target_w}:{target_h}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1")
    
    # Scale font size relative to a 1080p (1920 height for 9:16) baseline
    # The default font sizes in the UI assume a 1920 height canvas
    if target_h:
        font_size = int(font_size * (target_h / 1920.0))
    else:
        # If original aspect ratio, we'd theoretically need ffprobe to get height, but for now we'll just use scale_factor
        font_size = int(font_size * scale_factor)

    ass_path = input_video_path + ".ass"
    print('{"progress": 10}', flush=True)
    print("Generating subtitles from template...")
    generate_ass_from_template(transcription, ass_path, template, text_color, glow_color, font_size, pos_x, pos_y, render_mode, target_w, target_h)
    
    print('{"progress": 60}', flush=True)
    print("Burning subtitles to video...")
    
    # Escape ass path for Windows/Unix
    escaped_ass_path = ass_path.replace("\\", "\\\\").replace(":", "\\:")
    vf_filters.append(f"ass='{escaped_ass_path}'")
    
    vf_string = ",".join(vf_filters)
    
    try:
        result = subprocess.run([
            "ffmpeg", "-i", input_video_path, 
            "-vf", vf_string, 
            "-c:v", "libx264", 
            "-preset", "slow",
            "-crf", "18",
            "-pix_fmt", "yuv420p", 
            "-c:a", "aac", 
            output_video_path, "-y"
        ], capture_output=True, text=True)
        
        if result.returncode != 0:
            raise Exception(f"FFmpeg error: {result.stderr}")
            
    except subprocess.CalledProcessError as e:
        raise Exception(f"Failed to burn subtitles: {e}")

    if os.path.exists(ass_path):
        os.remove(ass_path)
        
    print('{"progress": 100}', flush=True)
    return output_video_path

if __name__ == "__main__":
    import argparse
    import json

    parser = argparse.ArgumentParser(description="Video Processor")
    parser.add_argument("--input", required=True, help="Input video file path")
    parser.add_argument("--output", required=True, help="Output file path")
    parser.add_argument("--mode", required=True, choices=["transcribe", "export"], help="Operation mode")
    parser.add_argument("--config", help="Path to export configuration JSON (only for export mode)")
    
    args = parser.parse_args()

    if args.mode == "transcribe":
        print('{"progress": 10}', flush=True)
        res = transcribe_only(args.input)
        print('{"progress": 90}', flush=True)
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(res, f)
        print('{"progress": 100}', flush=True)
    
    elif args.mode == "export":
        if not args.config:
            raise ValueError("--config is required for export mode")
        
        with open(args.config, "r", encoding="utf-8") as f:
            config = json.load(f)
            
        transcription = config.get("transcription", {})
        template = config.get("template", "Classic")
        text_color = config.get("text_color", "#FFFFFF")
        glow_color = config.get("glow_color", "#000000")
        font_size = config.get("font_size", 90)
        pos_x = config.get("pos_x", 50.0)
        pos_y = config.get("pos_y", 80.0)
        render_mode = config.get("render_mode", "word")
        aspect_ratio = config.get("aspect_ratio", "Original")
        quality = config.get("quality", "1080p")
        fit_mode = config.get("fit_mode", "crop")

        export_video(
            args.input, 
            args.output, 
            transcription, 
            template, 
            text_color, 
            glow_color, 
            font_size, 
            pos_x, 
            pos_y, 
            render_mode, 
            aspect_ratio,
            quality,
            fit_mode
        )
