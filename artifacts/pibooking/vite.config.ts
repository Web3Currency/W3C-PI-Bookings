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

        if ((req.url?.match(/^\/api\/pi\/bookings\/[^/]+\/(accept|reject)$/)) && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => { body += chunk; });
          req.on('end', async () => {
            try {
              const match = req.url.match(/^\/api\/pi\/bookings\/([^/]+)\/(accept|reject)$/);
              const bookingId = match?.[1];
              const action = match?.[2];
              const payload = JSON.parse(body || '{}');
              const { accessToken, rejectionReason, payoutTxHash } = payload;

              if (!bookingId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingId)) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'A valid bookingId is required.' }));
                return;
              }
              if (!accessToken || typeof accessToken !== 'string' || accessToken.trim() === '') {
                res.statusCode = 401;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Pi access token is required.' }));
                return;
              }
              if (action === 'reject' && (!rejectionReason || String(rejectionReason).trim() === '')) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'A rejection reason is required.' }));
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
              if (!piUser.uid) {
                res.statusCode = 401;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Incomplete user data from Pi Network.' }));
                return;
              }

              const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
              const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
              if (!supabaseUrl || !supabaseKey) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Server configuration error: Supabase server credentials are missing.' }));
                return;
              }

              const supabaseHeaders: Record<string, string> = {
                apikey: supabaseKey,
                'Content-Type': 'application/json',
                Prefer: 'return=representation',
              };
              if (supabaseKey.startsWith('eyJ')) {
                supabaseHeaders.Authorization = `Bearer ${supabaseKey}`;
              }

              const cleanUrl = supabaseUrl.replace(/\/$/, '');
              const providerResponse = await fetch(
                `${cleanUrl}/rest/v1/providers?select=id,pi_uid&pi_uid=eq.${encodeURIComponent(piUser.uid)}&limit=1`,
                { headers: supabaseHeaders },
              );
              if (!providerResponse.ok) {
                const providerError = await providerResponse.text().catch(() => '');
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: providerError || `Supabase provider lookup failed (${providerResponse.status}).` }));
                return;
              }
              const providers = await providerResponse.json();
              const provider = providers[0];
              if (!provider) {
                res.statusCode = 403;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'No provider profile is linked to this Pi account.' }));
                return;
              }

              const updates = action === 'accept'
                ? { status: 'In Progress', updated_at: new Date().toISOString() }
                : {
                    status: 'Cancelled',
                    escrow_status: 'refunded',
                    rejection_reason: String(rejectionReason).trim(),
                    refunded_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    ...(payoutTxHash ? { payout_tx_hash: payoutTxHash } : {}),
                  };

              const bookingResponse = await fetch(
                `${cleanUrl}/rest/v1/bookings?id=eq.${encodeURIComponent(bookingId)}&provider_id=eq.${encodeURIComponent(provider.id)}&status=in.(Pending,Confirmed)&escrow_status=eq.paid_escrowed`,
                {
                  method: 'PATCH',
                  headers: supabaseHeaders,
                  body: JSON.stringify(updates),
                },
              );
              if (!bookingResponse.ok) {
                const bookingError = await bookingResponse.text().catch(() => '');
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: bookingError || `Supabase booking update failed (${bookingResponse.status}).` }));
                return;
              }

              const rows = await bookingResponse.json();
              if (!Array.isArray(rows) || rows.length === 0) {
                res.statusCode = 409;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: action === 'accept'
                  ? 'Booking is not available for acceptance or is not assigned to this provider.'
                  : 'Booking is not available for rejection or is not assigned to this provider.' }));
                return;
              }

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, booking: rows[0] }));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err?.message || `Failed to ${req.url?.endsWith('/reject') ? 'reject' : 'accept'} booking.` }));
            }
          });
          return;
        }

        if ((req.url?.match(/^\/api\/pi\/bookings\/[^/]+\/complete$/)) && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => { body += chunk; });
          req.on('end', async () => {
            try {
              const match = req.url.match(/^\/api\/pi\/bookings\/([^/]+)\/complete$/);
              const bookingId = match?.[1];
              const { accessToken } = JSON.parse(body || '{}');

              if (!bookingId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingId)) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'A valid bookingId is required.' }));
                return;
              }
              if (!accessToken || typeof accessToken !== 'string' || accessToken.trim() === '') {
                res.statusCode = 401;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Pi access token is required.' }));
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
              if (!piUser.uid) {
                res.statusCode = 401;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Incomplete user data from Pi Network.' }));
                return;
              }

              const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
              const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
              if (!supabaseUrl || !supabaseKey) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Server configuration error: Supabase server credentials are missing.' }));
                return;
              }

              const supabaseHeaders: Record<string, string> = {
                apikey: supabaseKey,
                'Content-Type': 'application/json',
                Prefer: 'return=representation',
              };
              if (supabaseKey.startsWith('eyJ')) {
                supabaseHeaders.Authorization = `Bearer ${supabaseKey}`;
              }
              const cleanUrl = supabaseUrl.replace(/\/$/, '');

              const bookingResponse = await fetch(
                `${cleanUrl}/rest/v1/bookings?id=eq.${encodeURIComponent(bookingId)}&status=eq.In%20Progress&escrow_status=eq.paid_escrowed&select=id,client_pi_uid,customer_pi_username,client_pi_username,status,escrow_status`,
                { headers: supabaseHeaders },
              );
              if (!bookingResponse.ok) {
                const bookingError = await bookingResponse.text().catch(() => '');
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: bookingError || `Supabase booking lookup failed (${bookingResponse.status}).` }));
                return;
              }

              const rows = await bookingResponse.json();
              if (!Array.isArray(rows) || rows.length === 0) {
                res.statusCode = 409;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Booking is not in progress or escrow is not currently held.' }));
                return;
              }

              const booking = rows[0];
              const clientUid = piUser.uid;
              const verifiedUsername = piUser.username || null;
              const storedClientUid = booking.client_pi_uid || null;
              const storedUsername = booking.customer_pi_username || booking.client_pi_username || null;

              if (storedClientUid && storedClientUid !== clientUid) {
                res.statusCode = 403;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'This booking belongs to a different Pi account.' }));
                return;
              }
              if (!storedClientUid && storedUsername && verifiedUsername && storedUsername.toLowerCase() !== verifiedUsername.toLowerCase()) {
                res.statusCode = 403;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'This booking belongs to a different Pi account.' }));
                return;
              }

              const filters = storedClientUid
                ? `id=eq.${encodeURIComponent(bookingId)}&client_pi_uid=eq.${encodeURIComponent(clientUid)}`
                : `id=eq.${encodeURIComponent(bookingId)}`;
              const patch = {
                escrow_status: 'completion_confirmed',
                confirmed_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                ...(storedClientUid ? {} : { client_pi_uid: clientUid }),
              };

              const updateResponse = await fetch(
                `${cleanUrl}/rest/v1/bookings?${filters}&status=eq.In%20Progress&escrow_status=eq.paid_escrowed`,
                { method: 'PATCH', headers: supabaseHeaders, body: JSON.stringify(patch) },
              );
              if (!updateResponse.ok) {
                const updateError = await updateResponse.text().catch(() => '');
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: updateError || `Supabase booking completion update failed (${updateResponse.status}).` }));
                return;
              }

              const updatedRows = await updateResponse.json();
              if (!Array.isArray(updatedRows) || updatedRows.length === 0) {
                res.statusCode = 409;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Booking could not be confirmed. It may have changed state.' }));
                return;
              }

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, booking: updatedRows[0] }));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err?.message || 'Failed to confirm booking completion.' }));
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

              const txidFinal = completeData.txid || completeData.transaction?.txid || txid;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, txid: txidFinal, paymentId }));
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

              const txidFinal = completeData.txid || completeData.transaction?.txid || txid;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, txid: txidFinal, paymentId }));
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
