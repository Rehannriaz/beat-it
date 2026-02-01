// frontend/src/lib/spotify/transform.ts

import type { SpotifyAudioAnalysis, SpotifyAudioFeatures } from './types';
import type { AudioFeatures } from '@/types/api';

/**
 * Generate AudioFeatures from basic track info when Audio Analysis API is unavailable.
 * Uses tempo from audio-features if available, otherwise estimates based on duration.
 */
export function generateFeaturesFromTrack(
  durationMs: number,
  audioFeatures?: SpotifyAudioFeatures | null
): AudioFeatures {
  const duration = durationMs / 1000;

  // Use tempo from audio-features if available, otherwise default to 120 BPM
  const bpm = audioFeatures?.tempo ?? 120;
  const energy = audioFeatures?.energy ?? 0.6;
  const danceability = audioFeatures?.danceability ?? 0.5;

  // Calculate beat interval in seconds
  const beatInterval = 60 / bpm;

  // Generate beat times
  const beat_times: number[] = [];
  for (let t = 0; t < duration; t += beatInterval) {
    beat_times.push(t);
  }

  // Generate downbeat times (every 4 beats)
  const downbeat_times: number[] = [];
  for (let i = 0; i < beat_times.length; i += 4) {
    downbeat_times.push(beat_times[i]);
  }

  // Generate onset times (subset of beats based on energy)
  const onsetInterval = energy > 0.7 ? 1 : energy > 0.4 ? 2 : 4;
  const onset_times = beat_times.filter((_, i) => i % onsetInterval === 0);
  const onset_strengths = onset_times.map(() => 0.5 + Math.random() * 0.5);

  // Generate simple energy curves
  const numPoints = Math.floor(duration / 0.5); // One point every 0.5 seconds
  const energy_curve = Array(numPoints).fill(0).map((_, i) => {
    // Create a basic arc: low at start/end, high in middle
    const progress = i / numPoints;
    const arc = Math.sin(progress * Math.PI);
    return 0.3 + arc * 0.5 * energy;
  });

  const intensity_curve = [...energy_curve];
  const bass_energy = energy_curve.map(e => e * (0.8 + Math.random() * 0.4));
  const mid_energy = energy_curve.map(e => e * (0.7 + Math.random() * 0.6));
  const high_energy = energy_curve.map(e => e * (0.5 + Math.random() * 0.5));

  // Generate simple song structure sections
  const segments = [];
  const sectionDuration = duration / 5;
  const labels = ['intro', 'verse', 'chorus', 'verse', 'outro'];
  for (let i = 0; i < 5; i++) {
    segments.push({
      start: i * sectionDuration,
      end: (i + 1) * sectionDuration,
      label: labels[i],
    });
  }

  // Energy segments based on structure
  const energy_segments = segments.map(seg => ({
    start: seg.start,
    end: seg.end,
    level: seg.label === 'chorus' ? 'high' : seg.label === 'intro' || seg.label === 'outro' ? 'low' : 'medium',
  }));

  return {
    bpm,
    duration,
    beat_times,
    downbeat_times,
    onset_times,
    onset_strengths,
    energy_curve,
    energy_segments,
    bass_energy,
    mid_energy,
    high_energy,
    segments,
    intensity_curve,
  };
}

/**
 * Infer section labels based on position and loudness.
 * Spotify sections don't have labels, so we infer them.
 */
function inferSectionLabel(
  index: number,
  total: number,
  loudness: number,
  maxLoudness: number
): string {
  // First section is usually intro
  if (index === 0) return 'intro';
  // Last section is usually outro
  if (index === total - 1) return 'outro';
  // Loudest sections are likely chorus
  if (loudness > maxLoudness * 0.9) return 'chorus';
  // Second loudest could be chorus or bridge
  if (loudness > maxLoudness * 0.75) return 'chorus';
  // Everything else is verse or bridge
  return index % 3 === 0 ? 'bridge' : 'verse';
}

/**
 * Normalize loudness from dB (typically -60 to 0) to 0-1 range.
 */
function normalizeLoudness(loudness: number): number {
  // Spotify loudness is typically between -60 and 0 dB
  const normalized = (loudness + 60) / 60;
  return Math.max(0, Math.min(1, normalized));
}

/**
 * Transform Spotify Audio Analysis to AudioFeatures format.
 */
export function transformSpotifyAnalysis(
  analysis: SpotifyAudioAnalysis
): AudioFeatures {
  const { track, beats, bars, sections, segments } = analysis;

  // Extract beat times
  const beat_times = beats.map((b) => b.start);

  // Extract downbeat times (first beat of each bar)
  const downbeat_times = bars.map((b) => b.start);

  // Use segment boundaries as onset times
  const onset_times = segments.map((s) => s.start);

  // Normalize segment loudness for onset strengths
  const maxSegmentLoudness = Math.max(...segments.map((s) => s.loudness_max));
  const minSegmentLoudness = Math.min(...segments.map((s) => s.loudness_max));
  const loudnessRange = maxSegmentLoudness - minSegmentLoudness || 1;

  const onset_strengths = segments.map(
    (s) => (s.loudness_max - minSegmentLoudness) / loudnessRange
  );

  // Build energy arrays from segment pitches
  // Pitches are 12 values (C, C#, D, ..., B) with values 0-1
  // Group into bass (0-3), mid (4-7), high (8-11)
  const bass_energy: number[] = [];
  const mid_energy: number[] = [];
  const high_energy: number[] = [];

  segments.forEach((seg) => {
    const pitches = seg.pitches;
    const bass = (pitches[0] + pitches[1] + pitches[2] + pitches[3]) / 4;
    const mid = (pitches[4] + pitches[5] + pitches[6] + pitches[7]) / 4;
    const high = (pitches[8] + pitches[9] + pitches[10] + pitches[11]) / 4;
    bass_energy.push(bass);
    mid_energy.push(mid);
    high_energy.push(high);
  });

  // Build intensity curve from segment loudness
  const intensity_curve = segments.map((s) => normalizeLoudness(s.loudness_max));

  // Build energy curve (same as intensity for now)
  const energy_curve = [...intensity_curve];

  // Build energy segments (simplified)
  const energy_segments = sections.map((sec) => ({
    start: sec.start,
    end: sec.start + sec.duration,
    level: sec.loudness > -10 ? 'high' : sec.loudness > -20 ? 'medium' : 'low',
  }));

  // Build labeled segments from sections
  const maxSectionLoudness = Math.max(...sections.map((s) => s.loudness));
  const labeledSegments = sections.map((sec, i) => ({
    start: sec.start,
    end: sec.start + sec.duration,
    label: inferSectionLabel(i, sections.length, sec.loudness, maxSectionLoudness),
  }));

  return {
    bpm: track.tempo,
    duration: track.duration,
    beat_times,
    downbeat_times,
    onset_times,
    onset_strengths,
    energy_curve,
    energy_segments,
    bass_energy,
    mid_energy,
    high_energy,
    segments: labeledSegments,
    intensity_curve,
  };
}
