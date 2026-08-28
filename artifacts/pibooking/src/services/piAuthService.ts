import { PiUser } from '../types';

const PI_SANDBOX = import.meta.env.VITE_PI_SANDBOX === 'true';
const PI_USER_KEY = 'pi_authenticated_user';
const PI_SCOPE_VERSION_KEY = 'pi_auth_scope_version';
const PI_SCOPE_VERSION = 'wallet-address-v1';
const PI_SCOPES = ['username', 'payments', 'wallet_address'] as const;

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
    initPromise = null;
    return false;
  }
}

export const piAuthService = {
  /** Retrieve cached user only when it was authenticated with the current required scope set. */
  getStoredUser(): PiUser | null {
    try {
      const scopeVersion = sessionStorage.getItem(PI_SCOPE_VERSION_KEY);
      if (scopeVersion !== PI_SCOPE_VERSION) {
        sessionStorage.removeItem(PI_USER_KEY);
        sessionStorage.setItem(PI_SCOPE_VERSION_KEY, PI_SCOPE_VERSION);
        return null;
      }
      const raw = sessionStorage.getItem(PI_USER_KEY);
      return raw ? (JSON.parse(raw) as PiUser) : null;
    } catch {
      return null;
    }
  },

  clearStoredUser(): void {
    try {
      sessionStorage.removeItem(PI_USER_KEY);
      sessionStorage.removeItem(PI_SCOPE_VERSION_KEY);
    } catch {
      // Ignore storage failures; next sign-in will authenticate afresh.
    }
  },

  /**
   * Full authentication flow:
   *  1. Await Pi.init()
   *  2. Request username, payments and wallet_address scopes
   *  3. POST access token to /api/pi/auth for backend validation
   *  4. Cache the verified PiUser only after validation succeeds
   */
  async signIn(): Promise<PiUser> {
    const ready = await ensureInit();
    if (!ready || !window.Pi) {
      throw new Error('Pi SDK not available. Open this app in Pi Browser to sign in.');
    }

    const auth = await window.Pi.authenticate([...PI_SCOPES], (incompletePayment) => {
      const paymentId = incompletePayment?.identifier || incompletePayment?.paymentId;
      const txid = incompletePayment?.transaction?.txid || incompletePayment?.txid;
      if (!paymentId) return;
      const run = async () => {
        try {
          if (txid) {
            await fetch('/api/pi/payments/complete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ paymentId, txid }),
            });
          }
          await fetch('/api/pi/payments/reconcile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentId }),
          });
        } catch (err) {
          console.error('[Pi] Failed to resolve incomplete payment:', err);
        }
      };
      void run();
    });

    if (!auth?.user) {
      throw new Error('Pi authentication returned no user.');
    }

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
    };

    sessionStorage.setItem(PI_USER_KEY, JSON.stringify(piUser));
    sessionStorage.setItem(PI_SCOPE_VERSION_KEY, PI_SCOPE_VERSION);
    return piUser;
  },

  signOut(): void {
    this.clearStoredUser();
  },

  initSDK(): boolean {
    if (typeof window === 'undefined' || !window.Pi) return false;
    if (!initPromise) {
      initPromise = Promise.resolve(window.Pi.init({ version: '2.0', sandbox: PI_SANDBOX }));
    }
    return true;
  },

  async ensureSDKReady(): Promise<boolean> {
    return ensureInit();
  },

  async authenticateUser(): Promise<PiUser> {
    const stored = this.getStoredUser();
    if (stored) return stored;
    return this.signIn();
  },
};
