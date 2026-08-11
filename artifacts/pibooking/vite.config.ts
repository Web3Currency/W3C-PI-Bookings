import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

const port = Number(process.env.PORT || '3000');
const basePath = process.env.BASE_PATH || '/';

function apiServerPlugin() {
  return {
    name: 'api-server-middleware',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (req.url === '/api/health' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ status: 'ok' }));
          return;
        }
        if (req.url === '/api/pi/auth' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => { body += chunk; });
          req.on('end', async () => {
            try {
              const { accessToken } = JSON.parse(body || '{}');
              if (!accessToken || typeof accessToken !== 'string' || !accessToken.trim()) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'accessToken is required.' }));
                return;
              }
              const piResponse = await fetch('https://api.minepi.com/v2/me', {
                method: 'GET',
                headers: { Authorization: `Bearer ${accessToken.trim()}` },
              });
              if (!piResponse.ok) {
                res.statusCode = 401;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Invalid or expired Pi access token.' }));
                return;
              }
              const piUser = await piResponse.json();
              if (!piUser.uid || !piUser.username) {
                res.statusCode = 502;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Incomplete user data from Pi Network.' }));
                return;
              }
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ uid: piUser.uid, username: piUser.username }));
            } catch (err) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Could not reach Pi Network API.' }));
            }
          });
          return;
        }
        if (req.url === '/api/pi/payouts/release' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => { body += chunk; });
          req.on('end', async () => {
            try {
              const { bookingId, amountPi, providerPiUid, providerWalletAddress } = JSON.parse(body || '{}');
              if (!bookingId || !amountPi || !providerPiUid) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'bookingId, amountPi, and providerPiUid are required.' }));
                return;
              }
              const apiKey = process.env.PI_API_KEY;
              if (!apiKey) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Server configuration error: PI_API_KEY missing.' }));
                return;
              }

              // Create Payment
              const createRes = await fetch('https://api.minepi.com/v2/payments', {
                method: 'POST',
                headers: {
                  Authorization: `Key ${apiKey.trim()}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  payment: {
                    amount: Number(amountPi),
                    memo: `Escrow payout for booking ${bookingId}`,
                    metadata: { bookingId, type: 'payout' },
                    uid: providerPiUid.trim(),
                  },
                }),
              });

              const createRaw = await createRes.text().catch(() => '');
              let createData: any = {};
              try { createData = JSON.parse(createRaw); } catch { createData = { message: createRaw }; }

              if (!createRes.ok) {
                res.statusCode = createRes.status;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: createData.error || createData.message || 'Failed to create A2U payment with Pi Network.' }));
                return;
              }

              const paymentId = createData.identifier || createData.id;

              // Submit Payment
              const submitRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/submit`, {
                method: 'POST',
                headers: {
                  Authorization: `Key ${apiKey.trim()}`,
                  'Content-Type': 'application/json',
                },
              });

              const submitRaw = await submitRes.text().catch(() => '');
              let submitData: any = {};
              try { submitData = JSON.parse(submitRaw); } catch { submitData = { message: submitRaw }; }

              if (!submitRes.ok) {
                res.statusCode = submitRes.status;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: submitData.error || submitData.message || 'Failed to submit A2U payment with Pi Network.' }));
                return;
              }

              const txid = submitData.txid || submitData.transaction?.txid || paymentId;

              // Complete Payment
              const completeRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/complete`, {
                method: 'POST',
                headers: {
                  Authorization: `Key ${apiKey.trim()}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ txid }),
              });

              const completeRaw = await completeRes.text().catch(() => '');
              let completeData: any = {};
              try { completeData = JSON.parse(completeRaw); } catch { completeData = { message: completeRaw }; }

              if (!completeRes.ok) {
                res.statusCode = completeRes.status;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: completeData.error || completeData.message || 'Failed to complete A2U payment with Pi Network.' }));
                return;
              }

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, txid, paymentId }));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err?.message || 'Could not process Pi A2U payout.' }));
            }
          });
          return;
        }
        if (req.url === '/api/pi/payouts/refund' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => { body += chunk; });
          req.on('end', async () => {
            try {
              const { bookingId, amountPi, clientPiUid } = JSON.parse(body || '{}');
              if (!bookingId || !amountPi || !clientPiUid) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'bookingId, amountPi, and clientPiUid are required.' }));
                return;
              }
              const apiKey = process.env.PI_API_KEY;
              if (!apiKey) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Server configuration error: PI_API_KEY missing.' }));
                return;
              }

              const cleanUid = String(clientPiUid).trim().replace(/^@/, '');

              // Create Payment
              const createRes = await fetch('https://api.minepi.com/v2/payments', {
                method: 'POST',
                headers: {
                  Authorization: `Key ${apiKey.trim()}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  payment: {
                    amount: Number(amountPi),
                    memo: `Refund for booking ${bookingId}`,
                    metadata: { bookingId, type: 'refund' },
                    uid: cleanUid,
                  },
                }),
              });

              const createRaw = await createRes.text().catch(() => '');
              let createData: any = {};
              try { createData = JSON.parse(createRaw); } catch { createData = { message: createRaw }; }

              if (!createRes.ok) {
                res.statusCode = createRes.status;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: createData.error || createData.message || 'Failed to create A2U refund payment with Pi Network.' }));
                return;
              }

              const paymentId = createData.identifier || createData.id;

              // Submit Payment
              const submitRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/submit`, {
                method: 'POST',
                headers: {
                  Authorization: `Key ${apiKey.trim()}`,
                  'Content-Type': 'application/json',
                },
              });

              const submitRaw = await submitRes.text().catch(() => '');
              let submitData: any = {};
              try { submitData = JSON.parse(submitRaw); } catch { submitData = { message: submitRaw }; }

              if (!submitRes.ok) {
                res.statusCode = submitRes.status;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: submitData.error || submitData.message || 'Failed to submit A2U refund payment with Pi Network.' }));
                return;
              }

              const txid = submitData.txid || submitData.transaction?.txid || paymentId;

              // Complete Payment
              const completeRes = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/complete`, {
                method: 'POST',
                headers: {
                  Authorization: `Key ${apiKey.trim()}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ txid }),
              });

              const completeRaw = await completeRes.text().catch(() => '');
              let completeData: any = {};
              try { completeData = JSON.parse(completeRaw); } catch { completeData = { message: completeRaw }; }

              if (!completeRes.ok) {
                res.statusCode = completeRes.status;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: completeData.error || completeData.message || 'Failed to complete A2U refund payment with Pi Network.' }));
                return;
              }

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, txid, paymentId }));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err?.message || 'Could not process Pi A2U refund.' }));
            }
          });
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  base: basePath,
  plugins: [
    apiServerPlugin(),
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== 'production' &&
    process.env.REPL_ID !== undefined
      ? [
          await import('@replit/vite-plugin-cartographer').then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, '..'),
            }),
          ),
          await import('@replit/vite-plugin-dev-banner').then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(
        import.meta.dirname,
        '..',
        '..',
        'attached_assets',
      ),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
