import librosa
import numpy as np
from ..models import AudioFeatures


def analyze_audio(file_path: str) -> AudioFeatures:
    """Extract comprehensive audio features from an audio file using librosa."""

    # Load audio file
    y, sr = librosa.load(file_path, sr=22050)
    duration = librosa.get_duration(y=y, sr=sr)

    # BPM and beat detection
    tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
    beat_times = librosa.frames_to_time(beat_frames, sr=sr).tolist()

    # Handle tempo as array or scalar
    bpm = float(tempo[0]) if hasattr(tempo, '__len__') else float(tempo)

    # Downbeat detection (first beat of each measure, assuming 4/4)
    downbeat_times = beat_times[::4] if len(beat_times) >= 4 else beat_times

    # Onset detection
    onset_frames = librosa.onset.onset_detect(y=y, sr=sr)
    onset_times = librosa.frames_to_time(onset_frames, sr=sr).tolist()
    onset_env = librosa.onset.onset_strength(y=y, sr=sr)
    onset_strengths = (onset_env[onset_frames] / onset_env.max()).tolist() if len(onset_frames) > 0 else []

    # Energy analysis (RMS energy)
    hop_length = int(sr * 0.1)  # 100ms windows
    rms = librosa.feature.rms(y=y, hop_length=hop_length)[0]
    energy_curve = (rms / rms.max()).tolist() if rms.max() > 0 else rms.tolist()

    # Energy segments
    energy_segments = _compute_energy_segments(energy_curve, duration)

    # Frequency band energy
    bass_energy, mid_energy, high_energy = _compute_frequency_bands(y, sr)

    # Structural segmentation (simplified using spectral features)
    segments = _detect_segments(y, sr, duration)

    # Intensity curve (combination of energy and spectral flux)
    intensity_curve = _compute_intensity_curve(y, sr, len(energy_curve))

    return AudioFeatures(
        bpm=bpm,
        duration=duration,
        beat_times=beat_times,
        downbeat_times=downbeat_times,
        onset_times=onset_times,
        onset_strengths=onset_strengths,
        energy_curve=energy_curve,
        energy_segments=energy_segments,
        bass_energy=bass_energy,
        mid_energy=mid_energy,
        high_energy=high_energy,
        segments=segments,
        intensity_curve=intensity_curve,
    )


def _compute_energy_segments(energy_curve: list[float], duration: float) -> list[dict]:
    """Divide song into segments with energy levels."""
    segments = []
    num_segments = min(10, len(energy_curve))
    if num_segments == 0:
        return segments

    segment_size = len(energy_curve) // num_segments
    time_per_sample = duration / len(energy_curve)

    for i in range(num_segments):
        start_idx = i * segment_size
        end_idx = start_idx + segment_size if i < num_segments - 1 else len(energy_curve)
        segment_energy = energy_curve[start_idx:end_idx]
        avg_energy = sum(segment_energy) / len(segment_energy) if segment_energy else 0

        if avg_energy < 0.3:
            level = "low"
        elif avg_energy < 0.6:
            level = "medium"
        elif avg_energy < 0.85:
            level = "high"
        else:
            level = "peak"

        segments.append({
            "start": start_idx * time_per_sample,
            "end": end_idx * time_per_sample,
            "level": level,
        })

    return segments


def _compute_frequency_bands(y: np.ndarray, sr: int) -> tuple[list[float], list[float], list[float]]:
    """Compute energy in bass, mid, and high frequency bands over time."""
    hop_length = int(sr * 0.1)

    # Compute spectrogram
    S = np.abs(librosa.stft(y, hop_length=hop_length))
    freqs = librosa.fft_frequencies(sr=sr)

    # Define frequency bands
    bass_mask = freqs < 250
    mid_mask = (freqs >= 250) & (freqs < 4000)
    high_mask = freqs >= 4000

    # Sum energy in each band
    bass = S[bass_mask].sum(axis=0)
    mid = S[mid_mask].sum(axis=0)
    high = S[high_mask].sum(axis=0)

    # Normalize
    bass = (bass / bass.max()).tolist() if bass.max() > 0 else bass.tolist()
    mid = (mid / mid.max()).tolist() if mid.max() > 0 else mid.tolist()
    high = (high / high.max()).tolist() if high.max() > 0 else high.tolist()

    return bass, mid, high


def _detect_segments(y: np.ndarray, sr: int, duration: float) -> list[dict]:
    """Detect song structure segments using spectral clustering."""
    try:
        # Use librosa's segment detection
        bounds = librosa.segment.agglomerative(
            librosa.feature.mfcc(y=y, sr=sr),
            k=min(8, max(2, int(duration / 20)))  # Roughly one segment per 20 seconds
        )
        bound_times = librosa.frames_to_time(bounds, sr=sr).tolist()

        # Label segments based on position
        labels = ["intro", "verse", "chorus", "verse", "chorus", "bridge", "chorus", "outro"]
        segments = []

        for i in range(len(bound_times)):
            start = bound_times[i]
            end = bound_times[i + 1] if i + 1 < len(bound_times) else duration
            label = labels[i % len(labels)]
            segments.append({"start": start, "end": end, "label": label})

        return segments
    except Exception:
        # Fallback: simple even division
        return [{"start": 0, "end": duration, "label": "main"}]


def _compute_intensity_curve(y: np.ndarray, sr: int, target_length: int) -> list[float]:
    """Compute overall intensity combining multiple features."""
    hop_length = int(sr * 0.1)

    # RMS energy
    rms = librosa.feature.rms(y=y, hop_length=hop_length)[0]

    # Spectral flux (change in spectrum)
    onset_env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop_length)

    # Ensure same length
    min_len = min(len(rms), len(onset_env), target_length)
    rms = rms[:min_len]
    onset_env = onset_env[:min_len]

    # Normalize and combine
    rms_norm = rms / rms.max() if rms.max() > 0 else rms
    onset_norm = onset_env / onset_env.max() if onset_env.max() > 0 else onset_env

    intensity = (0.6 * rms_norm + 0.4 * onset_norm).tolist()

    return intensity
