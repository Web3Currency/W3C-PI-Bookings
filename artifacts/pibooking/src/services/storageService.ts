import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { STORAGE_BUCKETS } from '../config/constants';

export const storageService = {
  async uploadFile(
    bucket: keyof typeof STORAGE_BUCKETS,
    filePath: string,
    file: File
  ): Promise<string | null> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured. Storage upload skipped.');
      return null;
    }

    const bucketName = STORAGE_BUCKETS[bucket];

    try {
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, { upsert: true });

      if (error || !data) {
        console.error('Storage upload error:', error);
        return null;
      }

      const { data: publicData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      return publicData?.publicUrl || null;
    } catch (e) {
      console.error('Failed to upload file to Supabase storage', e);
      return null;
    }
  }
};
