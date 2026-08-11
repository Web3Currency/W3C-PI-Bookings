import { PiUser } from '../types';

const PI_SANDBOX = import.meta.env.VITE_PI_SANDBOX === 'true';
const PI_USER_KEY = 'pi_authenticated_user';

/**
 * Singleton init promise — Pi.init() is treated as a Promise and awaited
 * exactly once before any authenticate() call.
 */
let initPromise: Promise<void> | null = null;

async function ensureInit(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.Pi) return false;
  if (!initPromise) {
    // Pi.init returns a Promise per the Pi SDK docs; await it fully.
    initPromise = Promise.resolve(window.Pi.init({ version: '2.0', sandbox: PI_SANDBOX }));
  }
  try {
    await initPromise;
    return true;
  } catch (e) {
    console.warn('[Pi] SDK init failed:', e);
    initPromise = null; // allow retry
    return false;
  }
}

export const piAuthService = {
  /** Retrieve cached user from session storage (survives page refresh within tab). */
  getStoredUser(): PiUser | null {
    try {
      const raw = sessionStorage.getItem(PI_USER_KEY);
      return raw ? (JSON.parse(raw) as PiUser) : null;
    } catch {
      return null;
    }
  },

  clearStoredUser(): void {
    sessionStorage.removeItem(PI_USER_KEY);
  },

  /**
   * Full authentication flow:
   *  1. Await Pi.init()
   *  2. Call Pi.authenticate(['username', 'payments'], ...)
   *  3. POST access token to /api/pi/auth for backend validation
   *  4. Cache and return the verified PiUser
   */
  async signIn(): Promise<PiUser> {
    const ready = await ensureInit();
    if (!ready || !window.Pi) {
      throw new Error('Pi SDK not available. Open this app in Pi Browser to sign in.');
    }

    const auth = await window.Pi.authenticate(['username', 'payments'], (incompletePayment) => {
      const paymentId = incompletePayment?.identifier || incompletePayment?.paymentId;
      const txid = incompletePayment?.transaction?.txid || incompletePayment?.txid;
      if (paymentId && txid) {
        fetch('/api/pi/payments/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentId, txid }),
        }).catch((err) => console.error('[Pi] Failed to resolve incomplete payment:', err));
      }
    });

    if (!auth?.user) {
      throw new Error('Pi authentication returned no user.');
    }

    // Validate access token server-side via /api/pi/auth → api.minepi.com/v2/me
    const resp = await fetch('/api/pi/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken: auth.accessToken }),
    });

    if (!resp.ok) {
      const body = await resp.json().catch(() => ({ error: 'Validation failed' }));
      throw new Error(body.error ?? 'Backend Pi token validation failed.');
    }

    const validated: { uid: string; username: string } = await resp.json();

    const piUser: PiUser = {
      uid: validated.uid,
      username: validated.username,
      accessToken: auth.accessToken,
      verified: true,
    };

    sessionStorage.setItem(PI_USER_KEY, JSON.stringify(piUser));
    return piUser;
  },

  signOut(): void {
    this.clearStoredUser();
  },

  // ── Backward-compat shims used by piPaymentService ──────────────────────────

  /** Ensures SDK is initialised synchronously (fire-and-forget). */
  initSDK(): boolean {
    if (typeof window === 'undefined' || !window.Pi) return false;
    if (!initPromise) {
      initPromise = Promise.resolve(window.Pi.init({ version: '2.0', sandbox: PI_SANDBOX }));
    }
    return true;
  },

  /** Awaits full SDK init — use this before createPayment(), not initSDK(). */
  async ensureSDKReady(): Promise<boolean> {
    return ensureInit();
  },

  /** Legacy alias — payment service calls this before createPayment(). */
  async authenticateUser(): Promise<PiUser> {
    const stored = this.getStoredUser();
    if (stored) return stored;
    return this.signIn();
  },
};
