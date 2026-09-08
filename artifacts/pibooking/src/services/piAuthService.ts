import { PiUser } from '../types';

const PI_SANDBOX = import.meta.env.VITE_PI_SANDBOX === 'true';
const PI_USER_KEY = 'pi_authenticated_user';
const PI_SCOPE_VERSION_KEY = 'pi_auth_scope_version';
const PI_SCOPE_VERSION = 'wallet-address-v2';
const PI_SCOPES = ['username', 'payments', 'wallet_address'] as const;

let initPromise: Promise<void> | null = null;
async function ensureInit(): Promise<boolean> { if (typeof window === 'undefined' || !window.Pi) return false; if (!initPromise) initPromise = Promise.resolve(window.Pi.init({ version: '2.0', sandbox: PI_SANDBOX })); try { await initPromise; return true; } catch (e) { console.warn('[Pi] SDK init failed:', e); initPromise = null; return false; } }
function readWalletAddress(user: any): string | undefined { return user?.wallet_address || user?.walletAddress || user?.wallet?.publicKey || user?.wallet?.address || undefined; }

export const piAuthService = {
  getStoredUser(): PiUser | null { try { if (sessionStorage.getItem(PI_SCOPE_VERSION_KEY) !== PI_SCOPE_VERSION) { sessionStorage.removeItem(PI_USER_KEY); sessionStorage.setItem(PI_SCOPE_VERSION_KEY, PI_SCOPE_VERSION); return null; } const raw = sessionStorage.getItem(PI_USER_KEY); return raw ? (JSON.parse(raw) as PiUser) : null; } catch { return null; } },
  clearStoredUser(): void { try { sessionStorage.removeItem(PI_USER_KEY); sessionStorage.removeItem(PI_SCOPE_VERSION_KEY); } catch {} },
  async signIn(): Promise<PiUser> {
    if (!await ensureInit() || !window.Pi) throw new Error('Pi SDK not available. Open this app in Pi Browser to sign in.');
    const auth = await window.Pi.authenticate([...PI_SCOPES], (incompletePayment) => { const paymentId = incompletePayment?.identifier || incompletePayment?.paymentId; const txid = incompletePayment?.transaction?.txid || incompletePayment?.txid; if (!paymentId) return; void (async () => { try { if (txid) await fetch('/api/pi/payments/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentId, txid }) }); await fetch('/api/pi/payments/reconcile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentId }) }); } catch (err) { console.error('[Pi] Failed to resolve incomplete payment:', err); } })(); });
    return this.storeValidatedAuth(auth);
  },
  async storeValidatedAuth(auth: any): Promise<PiUser> {
    if (!auth?.user || !auth?.accessToken) throw new Error('Pi authentication returned no user.');
    const resp = await fetch('/api/pi/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accessToken: auth.accessToken }) });
    if (!resp.ok) { const body = await resp.json().catch(() => ({ error: 'Validation failed' })); throw new Error(body.error ?? 'Backend Pi token validation failed.'); }
    const validated: { uid: string; username: string; walletAddress?: string; wallet_address?: string } = await resp.json();
    const piUser: PiUser = { uid: validated.uid, username: validated.username, accessToken: auth.accessToken, walletAddress: validated.walletAddress || validated.wallet_address || readWalletAddress(auth.user) };
    sessionStorage.setItem(PI_USER_KEY, JSON.stringify(piUser)); sessionStorage.setItem(PI_SCOPE_VERSION_KEY, PI_SCOPE_VERSION); return piUser;
  },
  async ensurePaymentScope(): Promise<PiUser> {
    const stored = this.getStoredUser();
    if (!stored) throw new Error('Please sign in with Pi before making a payment.');
    if (!await ensureInit() || !window.Pi) throw new Error('Pi SDK not available. Open this app in Pi Browser to make a payment.');
    try {
      const auth = await window.Pi.authenticate([...PI_SCOPES], () => {});
      return await this.storeValidatedAuth(auth);
    } catch (error: any) {
      this.clearStoredUser();
      throw new Error(error?.message || 'Payment permission expired. Please sign in with Pi again.');
    }
  },
  signOut(): void { this.clearStoredUser(); },
  initSDK(): boolean { if (typeof window === 'undefined' || !window.Pi) return false; if (!initPromise) initPromise = Promise.resolve(window.Pi.init({ version: '2.0', sandbox: PI_SANDBOX })); return true; },
  async ensureSDKReady(): Promise<boolean> { return ensureInit(); },
  async authenticateUser(): Promise<PiUser> { const stored = this.getStoredUser(); return stored || this.signIn(); },
};

export async function requireSignIn(action: () => void): Promise<boolean> {
  const stored = piAuthService.getStoredUser();
  if (stored) {
    action();
    return true;
  }
  try {
    await piAuthService.signIn();
    action();
    return true;
  } catch (error) {
    console.warn('[Pi] Sign-in required:', error);
    return false;
  }
}
