import { useState, useEffect, useCallback } from 'react';
import { PiUser } from '../types';
import { piAuthService } from '../services/piAuthService';

interface UsePiAuthReturn {
  piUser: PiUser | null;
  loading: boolean;
  error: string | null;
  signIn: () => Promise<PiUser | null>;
  signOut: () => void;
}

export function usePiAuth(): UsePiAuthReturn {
  const [piUser, setPiUser] = useState<PiUser | null>(() => piAuthService.getStoredUser());
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Auto sign-in on mount if no cached session exists
  useEffect(() => {
    if (piUser) return; // already authenticated

    let cancelled = false;
    setLoading(true);
    setError(null);

    piAuthService
      .signIn()
      .then((user) => {
        if (!cancelled) setPiUser(user);
      })
      .catch((err: Error) => {
        if (!cancelled) {
          // Outside Pi Browser this always fails — not a fatal error for web preview
          console.warn('[Pi Auth] Auto sign-in skipped:', err.message);
          setError(err.message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = useCallback(async (): Promise<PiUser | null> => {
    setLoading(true);
    setError(null);
    try {
      const user = await piAuthService.signIn();
      setPiUser(user);
      return user;
    } catch (err: any) {
      setError(err.message ?? 'Sign-in failed.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(() => {
    piAuthService.signOut();
    setPiUser(null);
    setError(null);
  }, []);

  return { piUser, loading, error, signIn, signOut };
}
