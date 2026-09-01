import { PiUser } from '../types';

export interface GlobalUserProfile {
  piUid: string;
  username: string;
  photoUrl?: string | null;
}

const PROFILE_ENDPOINT = '/api/pi/user-profile';

export const userProfileService = {
  async getProfile(accessToken: string): Promise<GlobalUserProfile | null> {
    const response = await fetch(PROFILE_ENDPOINT, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!response.ok) return null;
    return response.json();
  },
  async saveProfile(accessToken: string, profile: { username: string; photoUrl?: string | null }): Promise<GlobalUserProfile> {
    const response = await fetch(PROFILE_ENDPOINT, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }, body: JSON.stringify(profile) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || 'Unable to update profile.');
    return body;
  },
  async uploadPhoto(accessToken: string, file: File): Promise<{ photoUrl: string }> {
    if (file.size > 2 * 1024 * 1024) throw new Error('Profile picture must be 2 MB or smaller.');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Use a JPG, PNG, or WebP image.');
    const form = new FormData(); form.append('file', file);
    const response = await fetch(`${PROFILE_ENDPOINT}/photo`, { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` }, body: form });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || 'Unable to upload profile picture.');
    return body;
  },
  applyToPiUser(piUser: PiUser, profile: GlobalUserProfile | null): PiUser {
    return profile ? { ...piUser, globalUsername: profile.username, globalPhotoUrl: profile.photoUrl || null } : piUser;
  },
};
