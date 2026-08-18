import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const MAX_MEDIA_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
export const ALLOWED_MEDIA_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
export const W3C_ASSETS_BUCKET = 'w3c-assets';

export interface MediaValidationResult {
  valid: boolean;
  error?: string;
}

export interface UploadMediaResult {
  path: string;
  publicUrl: string;
  caption?: string;
}

export interface UploadMediaOptions {
  providerIdentifier: string; // provider ID or Pi UID
  piAccessToken?: string;
  caption?: string;
}

/**
 * Validates file format and size for provider uploads.
 * Supported: PNG, JPG, JPEG, WebP. Maximum size: 2 MB.
 */
export function validateMediaFile(file: File): MediaValidationResult {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }

  const fileType = file.type?.toLowerCase();
  const fileName = file.name?.toLowerCase() || '';

  const isValidType =
    ALLOWED_MEDIA_TYPES.includes(fileType) ||
    fileName.endsWith('.png') ||
    fileName.endsWith('.jpg') ||
    fileName.endsWith('.jpeg') ||
    fileName.endsWith('.webp');

  if (!isValidType) {
    return {
      valid: false,
      error: 'Unsupported image format. Please select a PNG, JPG, or WebP file.',
    };
  }

  if (file.size > MAX_MEDIA_FILE_SIZE_BYTES) {
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `File size (${sizeInMb} MB) exceeds the maximum 2 MB limit.`,
    };
  }

  return { valid: true };
}

/**
 * Converts a File to a local base64 Data URL (for offline preview when unconfigured).
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Cleans identifier for storage path safety.
 */
function sanitizeIdentifier(identifier: string): string {
  if (!identifier) return 'unknown_provider';
  return identifier
    .replace(/^@/, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_');
}

/**
 * Resolves a storage path or full URL into a displayable public URL.
 */
export function getMediaUrl(pathOrUrl: string | undefined | null): string {
  if (!pathOrUrl || typeof pathOrUrl !== 'string') return '';
  const trimmed = pathOrUrl.trim();
  if (!trimmed) return '';

  // Already a full or blob / data URL
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }

  // Handle storage relative paths from w3c-assets bucket
  let cleanPath = trimmed.replace(/^\/+/, '');
  if (cleanPath.startsWith(`${W3C_ASSETS_BUCKET}/`)) {
    cleanPath = cleanPath.replace(`${W3C_ASSETS_BUCKET}/`, '');
  }

  if (isSupabaseConfigured()) {
    const { data } = supabase.storage.from(W3C_ASSETS_BUCKET).getPublicUrl(cleanPath);
    if (data?.publicUrl) {
      return data.publicUrl;
    }
  }

  return trimmed;
}

export const providerMediaService = {
  getMediaUrl,
  validateMediaFile,

  /**
   * Upload provider profile photo.
   * Path: providers/{provider}/profile/{timestamp}_{filename}
   */
  async uploadProfilePhoto(
    file: File,
    options: UploadMediaOptions
  ): Promise<UploadMediaResult> {
    return this.uploadMedia(file, 'profile', options);
  },

  /**
   * Upload provider portfolio showcase image.
   * Path: providers/{provider}/portfolio/{timestamp}_{filename}
   */
  async uploadPortfolioImage(
    file: File,
    options: UploadMediaOptions
  ): Promise<UploadMediaResult> {
    return this.uploadMedia(file, 'portfolio', options);
  },

  /**
   * Secure Media Upload Handler
   *
   * Architecture:
   * Provider -> Existing Pi authentication -> provider-media Supabase Edge Function
   * -> server-side authorization & validation -> Supabase Storage (w3c-assets)
   *
   * Direct client-to-storage bypass has been removed for security.
   */
  async uploadMedia(
    file: File,
    type: 'profile' | 'portfolio',
    options: UploadMediaOptions
  ): Promise<UploadMediaResult> {
    const validation = validateMediaFile(file);
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid media file.');
    }

    const cleanProvider = sanitizeIdentifier(options.providerIdentifier);
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = Date.now();
    const expectedStoragePath = `providers/${cleanProvider}/${type}/${timestamp}_${sanitizedFilename}`;

    // 1. Production Flow: Invoke provider-media Supabase Edge Function
    if (isSupabaseConfigured()) {
      console.log(`[provider-media] Invoking Edge Function for type="${type}" provider="${cleanProvider}"...`);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      formData.append('provider', cleanProvider);
      formData.append('providerId', cleanProvider);
      if (options.caption) {
        formData.append('caption', options.caption);
      }

      const headers: Record<string, string> = {};
      if (options.piAccessToken) {
        headers['x-pi-access-token'] = options.piAccessToken;
        headers['Authorization'] = `Bearer ${options.piAccessToken}`;
      }

      const { data, error } = await supabase.functions.invoke('provider-media', {
        body: formData,
        headers,
      });

      if (error) {
        console.error('[provider-media] Edge Function upload failed:', error.message);
        throw new Error(`Media upload failed: ${error.message || 'Server error'}`);
      }

      if (data) {
        console.log('[provider-media] Edge Function upload success:', data);
        const returnedPath = data.path || data.storagePath || data.key || expectedStoragePath;
        const returnedUrl = data.publicUrl || data.url || getMediaUrl(returnedPath);
        return {
          path: returnedPath,
          publicUrl: returnedUrl,
          caption: options.caption,
        };
      }

      throw new Error('Upload failed: Empty response from provider-media service.');
    }

    // 2. Offline / unconfigured development environment local preview
    console.log('[provider-media] Supabase not configured in development, using local data URL preview.');
    const localDataUrl = await fileToDataUrl(file);
    return {
      path: expectedStoragePath,
      publicUrl: localDataUrl,
      caption: options.caption,
    };
  },
};
