import { useState, useEffect, useCallback } from 'react';
import { PiUser } from '../types';
import { piAuthService } from '../services/piAuthService';
import { userProfileService } from '../services/userProfileService';

interface UsePiAuthReturn { piUser: PiUser | null; loading: boolean; error: string | null; signIn: () => Promise<PiUser | null>; signOut: () => void; refreshProfile: () => Promise<void>; }

async function withGlobalProfile(user: PiUser): Promise<PiUser> {
  if (!user.accessToken) return user;
  try {
    const profile = await userProfileService.getProfile(user.accessToken);
    return userProfileService.applyToPiUser(user, profile);
  } catch { return user; }
}

export function usePiAuth(): UsePiAuthReturn {
  const [piUser, setPiUser] = useState<PiUser | null>(() => piAuthService.getStoredUser());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!piUser) return;
    withGlobalProfile(piUser).then((updated) => setPiUser(updated));
  }, []);

  const signIn = useCallback(async () => {
    setLoading(true); setError(null);
    try { const user = await piAuthService.signIn(); const updated = await withGlobalProfile(user); setPiUser(updated); return updated; }
    catch (err: any) { setError(err?.message ?? 'Sign-in failed.'); return null; }
    finally { setLoading(false); }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!piUser?.accessToken) return;
    const updated = await withGlobalProfile(piUser); setPiUser(updated);
  }, [piUser]);

  const signOut = useCallback(() => { piAuthService.signOut(); setPiUser(null); setError(null); }, []);
  return { piUser, loading, error, signIn, signOut, refreshProfile };
}
