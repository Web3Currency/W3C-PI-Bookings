import React, { useEffect, useRef, useState } from 'react';
import { Camera, Loader2, UserRound } from 'lucide-react';
import { PiUser } from '../types';
import { userProfileService } from '../services/userProfileService';
import { BackButton } from './BackButton';

interface UserProfileViewProps {
  piUser: PiUser;
  onBack: () => void;
  onProfileUpdated: () => Promise<void>;
}

export const UserProfileView: React.FC<UserProfileViewProps> = ({ piUser, onBack, onProfileUpdated }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [username, setUsername] = useState(piUser.globalUsername || piUser.username || '');
  const [photoUrl, setPhotoUrl] = useState<string | null>(piUser.globalPhotoUrl || null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setUsername(piUser.globalUsername || piUser.username || '');
    setPhotoUrl(piUser.globalPhotoUrl || null);
  }, [piUser.globalUsername, piUser.globalPhotoUrl, piUser.username]);

  const displayUsername = username.replace(/^@/, '');
  const initials = (displayUsername || piUser.username || 'P').charAt(0).toUpperCase();

  const handleUpload = async (file?: File) => {
    if (!file || !piUser.accessToken) return;
    setError(null); setMessage(null); setUploading(true);
    try {
      const result = await userProfileService.uploadPhoto(piUser.accessToken, file);
      setPhotoUrl(result.photoUrl);
      await onProfileUpdated();
      setMessage('Profile picture updated.');
    } catch (err: any) {
      setError(err?.message || 'Unable to upload profile picture.');
    } finally { setUploading(false); }
  };

  const handleSave = async () => {
    if (!piUser.accessToken) return;
    const clean = displayUsername.trim();
    if (!clean || clean.length < 3) { setError('Username must be at least 3 characters.'); return; }
    if (!/^[a-zA-Z0-9._-]+$/.test(clean)) { setError('Use only letters, numbers, dots, underscores, or hyphens.'); return; }
    setError(null); setMessage(null); setSaving(true);
    try {
      await userProfileService.saveProfile(piUser.accessToken, { username: clean, photoUrl });
      await onProfileUpdated();
      setMessage('Profile updated.');
    } catch (err: any) { setError(err?.message || 'Unable to update profile.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-2xl mx-auto pb-24 animate-in fade-in slide-in-from-right-4 duration-200">
      <div className="flex items-center justify-between mb-6">
        <BackButton onClick={onBack} id="btn-back-from-user-profile" label="Back" />
        <h1 className="text-lg font-black text-zinc-900">My Profile</h1>
        <div className="w-10" />
      </div>

      <section className="rounded-3xl bg-white shadow-sm border border-zinc-100 p-6 sm:p-8 space-y-7">
        <div className="text-center space-y-2">
          <div className="relative w-28 h-28 mx-auto">
            <div className="w-28 h-28 rounded-full overflow-hidden bg-orange-100 border-4 border-white shadow-md flex items-center justify-center">
              {photoUrl ? <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" /> : <span className="text-3xl font-black text-orange-700">{initials}</span>}
            </div>
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="absolute right-0 bottom-0 w-10 h-10 rounded-full bg-orange-600 hover:bg-orange-500 text-white flex items-center justify-center shadow-md transition disabled:opacity-60 cursor-pointer" aria-label="Change profile picture">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            </button>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; e.currentTarget.value = ''; void handleUpload(file); }} />
          </div>
          <p className="text-xs text-zinc-500">This is your global W3C profile picture. JPG, PNG or WebP, maximum 2 MB.</p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black text-zinc-700">Username</label>
          <div className="flex items-center rounded-2xl border border-zinc-200 bg-zinc-50 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-100 overflow-hidden">
            <span className="pl-4 text-sm font-bold text-zinc-400">@</span>
            <input value={displayUsername} onChange={(e) => setUsername(e.target.value)} maxLength={32} className="w-full bg-transparent px-2 py-3.5 text-sm font-bold text-zinc-900 outline-none" placeholder="Choose a username" />
          </div>
          <p className="text-[11px] text-zinc-400">Your W3C username is separate from your Pi Network username.</p>
        </div>

        {error && <div className="rounded-2xl bg-red-50 border border-red-100 text-red-700 px-4 py-3 text-xs font-semibold">{error}</div>}
        {message && <div className="rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 px-4 py-3 text-xs font-semibold">{message}</div>}

        <button type="button" onClick={() => void handleSave()} disabled={saving || uploading} className="w-full py-3.5 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-black transition shadow-sm disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserRound className="w-4 h-4" />}
          Save Profile
        </button>
      </section>
    </div>
  );
};