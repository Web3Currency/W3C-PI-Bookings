import React, { useRef, useState } from 'react';
import { Plus, Trash2, Loader2, AlertCircle, Image as ImageIcon, CheckCircle2, MessageSquare, X } from 'lucide-react';
import { providerMediaService, getMediaUrl, validateMediaFile } from '../../services/providerMediaService';
import { PortfolioItem } from '../../types';

export interface PortfolioUploaderProps {
  items: PortfolioItem[];
  onChange: (items: PortfolioItem[]) => void;
  providerIdentifier: string;
  piAccessToken?: string;
  className?: string;
  disabled?: boolean;
  maxItems?: number;
}

interface UploadingState {
  id: string;
  fileName: string;
  previewUrl: string;
  progress: boolean;
  error?: string;
}

export const PortfolioUploader: React.FC<PortfolioUploaderProps> = ({
  items = [],
  onChange,
  providerIdentifier,
  piAccessToken,
  className = '',
  disabled = false,
  maxItems = 12,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingQueue, setUploadingQueue] = useState<UploadingState[]>([]);
  const [generalError, setGeneralError] = useState<string>('');

  const handleOpenPicker = () => {
    if (disabled) return;
    setGeneralError('');
    fileInputRef.current?.click();
  };

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const selectedFiles = Array.from(fileList);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    if (items.length + selectedFiles.length > maxItems) {
      setGeneralError(`You can upload a maximum of ${maxItems} portfolio images.`);
      return;
    }

    // Process each file
    for (const file of selectedFiles) {
      // 1. Client Validation
      const validation = validateMediaFile(file);
      if (!validation.valid) {
        setGeneralError(`"${file.name}": ${validation.error}`);
        continue;
      }

      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const localBlobUrl = URL.createObjectURL(file);

      // Add to uploading queue
      const queueItem: UploadingState = {
        id: tempId,
        fileName: file.name,
        previewUrl: localBlobUrl,
        progress: true,
      };

      setUploadingQueue((prev) => [...prev, queueItem]);

      try {
        const result = await providerMediaService.uploadPortfolioImage(file, {
          providerIdentifier: providerIdentifier || 'provider',
          piAccessToken,
        });

        const newItem: PortfolioItem = {
          id: tempId,
          imageUrl: result.publicUrl || localBlobUrl,
          path: result.path,
          caption: '',
        };

        // Remove from queue and add to items
        setUploadingQueue((prev) => prev.filter((q) => q.id !== tempId));
        onChange([...items, newItem]);
      } catch (err: any) {
        console.error('Portfolio upload error:', err);
        setUploadingQueue((prev) =>
          prev.map((q) =>
            q.id === tempId
              ? { ...q, progress: false, error: err?.message || 'Upload failed' }
              : q
          )
        );
      }
    }
  };

  const handleRemoveItem = (indexToRemove: number) => {
    if (disabled) return;
    const updated = items.filter((_, idx) => idx !== indexToRemove);
    onChange(updated);
  };

  const handleUpdateCaption = (indexToUpdate: number, caption: string) => {
    const updated = items.map((item, idx) => {
      if (idx === indexToUpdate) {
        return { ...item, caption };
      }
      return item;
    });
    onChange(updated);
  };

  const handleDismissFailedUpload = (idToRemove: string) => {
    setUploadingQueue((prev) => prev.filter((q) => q.id !== idToRemove));
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/jpg,image/webp"
        onChange={handleFilesSelected}
        disabled={disabled}
        className="hidden"
        id="provider-portfolio-images-input"
        aria-label="Upload portfolio images"
      />

      {/* General Error Banner */}
      {generalError && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start justify-between gap-2 text-xs text-rose-700 font-medium animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{generalError}</span>
          </div>
          <button
            type="button"
            onClick={() => setGeneralError('')}
            className="text-rose-400 hover:text-rose-700 p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Showcase Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {/* Uploaded Portfolio Items */}
        {items.map((item, index) => {
          const displayUrl = getMediaUrl(item.imageUrl || item.path);

          return (
            <div
              key={item.id || `portfolio_${index}`}
              className="group relative rounded-2xl bg-zinc-50 border border-zinc-200 overflow-hidden flex flex-col justify-between shadow-2xs hover:border-amber-400/80 transition-all duration-200"
            >
              {/* Image Preview */}
              <div className="relative aspect-4/3 bg-zinc-900 overflow-hidden">
                <img
                  src={displayUrl}
                  alt={item.caption || `Portfolio work ${index + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />

                {/* Remove Button */}
                <button
                  type="button"
                  onClick={() => handleRemoveItem(index)}
                  disabled={disabled}
                  aria-label="Remove image"
                  title="Remove image"
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-zinc-950/75 hover:bg-rose-600 text-white backdrop-blur-sm transition-colors cursor-pointer shadow-sm"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                {/* Index badge */}
                <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[10px] font-extrabold text-white">
                  #{index + 1}
                </span>
              </div>

              {/* Caption Input */}
              <div className="p-3 bg-white space-y-1.5 border-t border-zinc-100 flex-1 flex flex-col justify-between">
                <label className="block text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                  <MessageSquare className="w-3 h-3 text-amber-600" />
                  <span>Caption / Description</span>
                </label>
                <input
                  type="text"
                  value={item.caption || ''}
                  onChange={(e) => handleUpdateCaption(index, e.target.value)}
                  disabled={disabled}
                  placeholder="e.g. Modern E-commerce UI Design in Figma"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-amber-500 focus:bg-white transition"
                />
              </div>
            </div>
          );
        })}

        {/* Uploading Queue Items */}
        {uploadingQueue.map((queueItem) => (
          <div
            key={queueItem.id}
            className="relative rounded-2xl bg-zinc-50 border border-zinc-200 overflow-hidden flex flex-col justify-between shadow-2xs"
          >
            <div className="relative aspect-4/3 bg-zinc-900 overflow-hidden">
              <img
                src={queueItem.previewUrl}
                alt={queueItem.fileName}
                className="w-full h-full object-cover opacity-60"
              />
              <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center text-white text-center p-3">
                {queueItem.progress ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin text-amber-400 mb-1.5" />
                    <span className="text-xs font-bold">Uploading image...</span>
                    <span className="text-[10px] text-zinc-300 truncate max-w-full px-2">
                      {queueItem.fileName}
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-6 h-6 text-rose-400 mb-1.5" />
                    <span className="text-xs font-bold text-rose-300">Upload Failed</span>
                    <span className="text-[10px] text-zinc-300 line-clamp-2 px-2 mt-1">
                      {queueItem.error || 'Network error'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDismissFailedUpload(queueItem.id)}
                      className="mt-2 px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[10px] font-bold transition"
                    >
                      Dismiss
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Add Image Trigger Card */}
        {items.length + uploadingQueue.length < maxItems && (
          <div
            role="button"
            tabIndex={0}
            onClick={handleOpenPicker}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleOpenPicker();
              }
            }}
            aria-label="Upload portfolio image"
            className={`group rounded-2xl border-2 border-dashed border-zinc-300 hover:border-amber-500 bg-zinc-50 hover:bg-amber-50/30 min-h-[160px] flex flex-col items-center justify-center p-5 text-center cursor-pointer transition-all duration-200 active:scale-98 select-none ${
              disabled ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-zinc-200/70 group-hover:bg-amber-100 flex items-center justify-center mb-2 text-zinc-600 group-hover:text-amber-600 transition-colors">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-xs font-black text-zinc-800 group-hover:text-amber-700 transition-colors">
              Add Portfolio Image
            </span>
            <span className="text-[10px] text-zinc-500 font-medium mt-1">
              Select PNG, JPG, or WebP (max 2 MB)
            </span>
          </div>
        )}
      </div>

      {/* Empty State Help Text */}
      {items.length === 0 && uploadingQueue.length === 0 && (
        <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/80 flex items-center gap-3 text-xs text-zinc-600">
          <ImageIcon className="w-5 h-5 text-zinc-400 shrink-0" />
          <p className="leading-relaxed">
            Upload images of your past projects, case studies, or design samples. You can add captions to highlight your accomplishments to prospective clients.
          </p>
        </div>
      )}
    </div>
  );
};
