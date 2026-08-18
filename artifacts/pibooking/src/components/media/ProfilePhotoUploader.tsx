import React, { useRef, useState, useEffect } from 'react';
import { Camera, Plus, Loader2, AlertCircle, X, Check, RefreshCw } from 'lucide-react';
import { providerMediaService, getMediaUrl, validateMediaFile } from '../../services/providerMediaService';

export interface ProfilePhotoUploaderProps {
  value?: string; // Current photo URL or storage path
  onChange: (value: string) => void;
  providerIdentifier: string;
  piAccessToken?: string;
  className?: string;
  disabled?: boolean;
}

export const ProfilePhotoUploader: React.FC<ProfilePhotoUploaderProps> = ({
  value = '',
  onChange,
  providerIdentifier,
  piAccessToken,
  className = '',
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);

  // Sync preview with incoming value
  useEffect(() => {
    if (value) {
      setPreviewUrl(getMediaUrl(value));
    } else {
      setPreviewUrl('');
    }
  }, [value]);

  const handleContainerClick = () => {
    if (disabled || isUploading) return;
    setErrorMessage('');
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset file input so selecting the same file again triggers onChange
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    if (!file) return;

    // 1. Client Validation
    const validation = validateMediaFile(file);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Invalid image file.');
      return;
    }

    setErrorMessage('');
    setUploadSuccess(false);

    // 2. Immediate Local Preview
    const localBlobUrl = URL.createObjectURL(file);
    setPreviewUrl(localBlobUrl);
    setIsUploading(true);
    setUploadProgress(true);

    try {
      // 3. Upload through providerMediaService
      const result = await providerMediaService.uploadProfilePhoto(file, {
        providerIdentifier: providerIdentifier || 'provider',
        piAccessToken,
      });

      // Pass storage path (or public URL) to parent
      const finalValue = result.path || result.publicUrl;
      onChange(finalValue);
      setPreviewUrl(result.publicUrl || localBlobUrl);
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (err: any) {
      console.error('Profile photo upload error:', err);
      setErrorMessage(err?.message || 'Failed to upload photo. Please try again.');
      // Keep local blob for display if desired or reset if needed
    } finally {
      setIsUploading(false);
      setUploadProgress(false);
    }
  };

  const handleRemovePhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled || isUploading) return;
    setPreviewUrl('');
    setErrorMessage('');
    setUploadSuccess(false);
    onChange('');
  };

  return (
    <div className={`flex flex-col items-center sm:items-start gap-3 ${className}`}>
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        onChange={handleFileChange}
        disabled={disabled || isUploading}
        className="hidden"
        id="provider-profile-photo-input"
        aria-label="Upload profile photo"
      />

      <div className="flex items-center gap-4">
        {/* Circular Profile Image Container */}
        <div
          role="button"
          tabIndex={0}
          onClick={handleContainerClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleContainerClick();
            }
          }}
          aria-label={previewUrl ? 'Change profile photo' : 'Upload profile photo'}
          className={`group relative w-24 h-24 sm:w-28 sm:h-28 rounded-full cursor-pointer transition-all duration-200 select-none overflow-hidden shrink-0 ${
            previewUrl
              ? 'ring-2 ring-amber-500/80 shadow-md hover:ring-amber-600'
              : 'border-2 border-dashed border-zinc-300 hover:border-amber-500 bg-zinc-50 hover:bg-amber-50/40'
          } ${disabled ? 'opacity-60 cursor-not-allowed' : 'active:scale-95'}`}
        >
          {previewUrl ? (
            <>
              <img
                src={previewUrl}
                alt="Profile Preview"
                className="w-full h-full object-cover rounded-full"
              />

              {/* Hover / Active Overlay */}
              <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[11px] font-bold p-1 text-center">
                <Camera className="w-5 h-5 mb-0.5" />
                <span>Change</span>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center text-zinc-500 group-hover:text-amber-600 transition-colors">
              <div className="w-8 h-8 rounded-full bg-zinc-200/70 group-hover:bg-amber-100 flex items-center justify-center mb-1 transition-colors">
                <Plus className="w-4 h-4 text-zinc-600 group-hover:text-amber-600" />
              </div>
              <span className="text-[10px] font-bold leading-tight">Add Photo</span>
            </div>
          )}

          {/* Loading Spinner Overlay */}
          {isUploading && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center text-white text-[10px] font-bold z-10">
              <Loader2 className="w-6 h-6 animate-spin text-amber-400 mb-1" />
              <span>Uploading...</span>
            </div>
          )}
        </div>

        {/* Action Controls & Description */}
        <div className="flex flex-col justify-center space-y-1.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleContainerClick}
              disabled={disabled || isUploading}
              className="px-3.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-800 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {previewUrl ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Replace Photo</span>
                </>
              ) : (
                <>
                  <Camera className="w-3.5 h-3.5 text-amber-600" />
                  <span>Choose Photo</span>
                </>
              )}
            </button>

            {previewUrl && !isUploading && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                disabled={disabled}
                className="px-2.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-rose-50 hover:text-rose-600 text-zinc-600 font-bold text-xs transition flex items-center gap-1 cursor-pointer"
                title="Remove photo"
              >
                <X className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            )}
          </div>

          <p className="text-[11px] text-zinc-500 leading-snug">
            PNG, JPG, or WebP. Max 2 MB. Square orientation recommended.
          </p>

          {uploadSuccess && (
            <div className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 animate-in fade-in duration-200">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Profile photo uploaded successfully!</span>
            </div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="w-full p-2.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2 text-xs text-rose-700 font-medium animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p>{errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage('')}
            className="text-rose-400 hover:text-rose-700 p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
