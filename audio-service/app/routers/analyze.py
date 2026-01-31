from fastapi import APIRouter, HTTPException
from ..models import (
    AnalyzeRequest,
    AnalyzeResponse,
    GeneratePatternRequest,
    GeneratePatternResponse,
    GenerateFromFeaturesRequest,
    AudioFeaturesInput,
)
from ..models.audio_features import AudioFeatures
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


@router.post("/generate-pattern-from-features", response_model=GeneratePatternResponse)
async def generate_pattern_from_features_endpoint(request: GenerateFromFeaturesRequest):
    """Generate a game pattern from pre-analyzed audio features (e.g., from Spotify)."""
    try:
        # Convert input to AudioFeatures model
        features = AudioFeatures(
            bpm=request.features.bpm,
            duration=request.features.duration,
            beat_times=request.features.beat_times,
            downbeat_times=request.features.downbeat_times,
            onset_times=request.features.onset_times,
            onset_strengths=request.features.onset_strengths,
            energy_curve=request.features.energy_curve,
            energy_segments=request.features.energy_segments,
            bass_energy=request.features.bass_energy,
            mid_energy=request.features.mid_energy,
            high_energy=request.features.high_energy,
            segments=request.features.segments,
            intensity_curve=request.features.intensity_curve,
        )

        # Generate pattern using existing generator
        pattern = await generate_pattern(
            features=features,
            song_id=request.song_id,
            title=request.title,
            artist=request.artist,
            difficulty=request.difficulty,
            provider="algorithmic",
        )

        return GeneratePatternResponse(success=True, pattern=pattern)
    except Exception as e:
        return GeneratePatternResponse(success=False, error=str(e))
