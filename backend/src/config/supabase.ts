import { createClient } from '@supabase/supabase-js';
import { config } from './index';

export const supabase = createClient(config.supabase.url, config.supabase.anonKey);

export const uploadToStorage = async (
  file: Buffer,
  fileName: string,
  contentType: string
): Promise<{ url: string; path: string }> => {
  const filePath = `${Date.now()}-${fileName}`;

  const { error } = await supabase.storage
    .from(config.supabase.bucket)
    .upload(filePath, file, {
      contentType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(config.supabase.bucket)
    .getPublicUrl(filePath);

  return {
    url: urlData.publicUrl,
    path: filePath,
  };
};

export const deleteFromStorage = async (filePath: string): Promise<void> => {
  const { error } = await supabase.storage
    .from(config.supabase.bucket)
    .remove([filePath]);

  if (error) {
    throw new Error(`Storage delete failed: ${error.message}`);
  }
};
