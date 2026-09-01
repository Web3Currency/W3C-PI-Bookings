import { PiUser } from '../types';

export interface GlobalUserProfile {
  piUid: string;
  username: string;
  photoUrl?: string | null;
}

const PROFILE_ENDPOINT = '/api/pi/user-profile';

async function parseResponse(response: Response, fallback: string) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || fallback);
  return body;
}

export const userProfileService = {
  async getProfile(accessToken: string): Promise<GlobalUserProfile | null> {
    const response = await fetch(PROFILE_ENDPOINT, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!response.ok) return null;
    const body = await response.json();
    return { piUid: body.piUid || body.pi_uid, username: body.username, photoUrl: body.photoUrl ?? body.photo_url ?? null };
  },
  async saveProfile(accessToken: string, profile: { username: string; photoUrl?: string | null }): Promise<GlobalUserProfile> {
    const response = await fetch(PROFILE_ENDPOINT, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }, body: JSON.stringify(profile) });
    const body = await parseResponse(response, 'Unable to update profile.');
    return { piUid: body.piUid || body.pi_uid, username: body.username, photoUrl: body.photoUrl ?? body.photo_url ?? null };
  },
  async uploadPhoto(accessToken: string, file: File): Promise<{ photoUrl: string }> {
    if (file.size > 2 * 1024 * 1024) throw new Error('Profile picture must be 2 MB or smaller.');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Use a JPG, PNG, or WebP image.');
    const data = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Could not read the selected image.')); reader.readAsDataURL(file); });
    const response = await fetch(`${PROFILE_ENDPOINT}/photo`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ data, contentType: file.type }) });
    const body = await parseResponse(response, 'Unable to upload profile picture.');
    return { photoUrl: body.photoUrl };
  },
  applyToPiUser(piUser: PiUser, profile: GlobalUserProfile | null): PiUser {
    return profile ? { ...piUser, globalUsername: profile.username, globalPhotoUrl: profile.photoUrl || null } : piUser;
  },
};
