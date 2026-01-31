import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Song, ApiResponse, UploadSongInput, GamePattern, AudioFeatures, GeneratePatternInput } from '@/types/api';

// Query key factory - enables precise cache invalidation
export const songKeys = {
  all: ['songs'] as const,
  lists: () => [...songKeys.all, 'list'] as const,
  details: () => [...songKeys.all, 'detail'] as const,
  detail: (id: string) => [...songKeys.details(), id] as const,
  patterns: () => [...songKeys.all, 'pattern'] as const,
  pattern: (id: string) => [...songKeys.patterns(), id] as const,
  examplePattern: () => ['patterns', 'example'] as const,
};

// GET all songs
export function useSongs() {
  return useQuery({
    queryKey: songKeys.lists(),
    queryFn: async () => {
      const response = await api.get<ApiResponse<Song[]>>('/songs');
      return response.data;
    },
  });
}

// GET song by ID
export function useSong(id: string) {
  return useQuery({
    queryKey: songKeys.detail(id),
    queryFn: async () => {
      const response = await api.get<ApiResponse<Song>>(`/songs/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

// GET pattern for a song
export function useSongPattern(id: string) {
  return useQuery({
    queryKey: songKeys.pattern(id),
    queryFn: async () => {
      const response = await api.get<ApiResponse<GamePattern | null>>(`/songs/${id}/pattern`);
      return response.data;
    },
    enabled: !!id,
  });
}

// GET example pattern (for testing without uploaded songs)
export function useExamplePattern() {
  return useQuery({
    queryKey: songKeys.examplePattern(),
    queryFn: () => api.get<GamePattern>('/patterns/example'),
  });
}

// UPLOAD a new song
export function useUploadSong() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UploadSongInput) => {
      const formData = new FormData();
      formData.append('file', input.file);
      if (input.title) formData.append('title', input.title);
      if (input.artist) formData.append('artist', input.artist);
      if (input.duration) formData.append('duration', input.duration.toString());
      if (input.bpm) formData.append('bpm', input.bpm.toString());
      if (input.difficulty) formData.append('difficulty', input.difficulty);

      const response = await api.upload<ApiResponse<Song>>('/songs/upload', formData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: songKeys.lists() });
    },
  });
}

// UPDATE pattern for a song
export function useUpdateSongPattern() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, pattern }: { id: string; pattern: GamePattern }) => {
      const response = await api.put<ApiResponse<Song>>(`/songs/${id}/pattern`, { pattern });
      return response.data;
    },
    onSuccess: (_data: Song, variables: { id: string; pattern: GamePattern }) => {
      queryClient.invalidateQueries({ queryKey: songKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: songKeys.pattern(variables.id) });
    },
  });
}

// DELETE a song
export function useDeleteSong() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/songs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: songKeys.lists() });
    },
  });
}

// ANALYZE a song (extract audio features)
export function useAnalyzeSong() {
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<ApiResponse<AudioFeatures>>(`/songs/${id}/analyze`, {});
      return response.data;
    },
  });
}

// GENERATE pattern for a song using AI
export function useGeneratePattern() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: GeneratePatternInput & { id: string }) => {
      const response = await api.post<ApiResponse<Song>>(`/songs/${id}/generate-pattern`, input);
      return response.data;
    },
    onSuccess: (data: Song) => {
      queryClient.invalidateQueries({ queryKey: songKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: songKeys.pattern(data.id) });
      queryClient.invalidateQueries({ queryKey: songKeys.lists() });
    },
  });
}
