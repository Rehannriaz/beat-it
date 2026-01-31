from fastapi import APIRouter, HTTPException
from ..models import (
    AnalyzeRequest,
    AnalyzeResponse,
    GeneratePatternRequest,
    GeneratePatternResponse,
)
from ..services.audio_analyzer import analyze_audio
from ..services.pattern_generator import generate_pattern
from ..utils.file_handler import download_audio, cleanup_temp_file

router = APIRouter()


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_audio_endpoint(request: AnalyzeRequest):
    """Analyze an audio file and extract features."""
    temp_file = None
    try:
        temp_file = await download_audio(request.audio_url)
        features = analyze_audio(temp_file)
        return AnalyzeResponse(success=True, features=features)
    except Exception as e:
        return AnalyzeResponse(success=False, error=str(e))
    finally:
        if temp_file:
            cleanup_temp_file(temp_file)


@router.post("/generate-pattern", response_model=GeneratePatternResponse)
async def generate_pattern_endpoint(request: GeneratePatternRequest):
    """Analyze audio and generate a game pattern using AI."""
    temp_file = None
    try:
        # Download and analyze audio
        temp_file = await download_audio(request.audio_url)
        features = analyze_audio(temp_file)

        # Generate pattern with AI
        pattern = await generate_pattern(
            features=features,
            song_id=request.song_id,
            title=request.title,
            artist=request.artist,
            difficulty=request.difficulty,
            provider=request.provider,
        )

        return GeneratePatternResponse(success=True, pattern=pattern)
    except Exception as e:
        return GeneratePatternResponse(success=False, error=str(e))
    finally:
        if temp_file:
            cleanup_temp_file(temp_file)
