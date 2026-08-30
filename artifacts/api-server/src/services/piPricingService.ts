const COIN_ID = 'pi-network';
const CACHE_TTL_MS = 30_000;

type RateCache = {
  rates: Record<string, number>;
  updatedAt: number;
};

let cache: RateCache | null = null;

function normalizeCurrency(currency: string): string {
  return String(currency || '').trim().toLowerCase();
}

function buildUrl(currencies: string[]) {
  const url = new URL('https://api.coingecko.com/api/v3/simple/price');
  url.searchParams.set('ids', COIN_ID);
  url.searchParams.set('vs_currencies', currencies.join(','));
  url.searchParams.set('include_last_updated_at', 'true');
  url.searchParams.set('precision', 'full');
  return url;
}

function getApiHeaders(): HeadersInit {
  const key = process.env.COINGECKO_API_KEY?.trim();
  if (!key) return {};
  return { 'x-cg-demo-api-key': key };
}

export async function getPiFiatRates(currencies: string[]): Promise<{ rates: Record<string, number>; source: 'coingecko'; updatedAt: string }> {
  const requested = [...new Set(currencies.map(normalizeCurrency).filter(Boolean))];
  if (!requested.length) throw new Error('At least one fiat currency is required.');

  const now = Date.now();
  const cached = cache && now - cache.updatedAt < CACHE_TTL_MS;
  const cachedRates: Record<string, number> = {};
  const missing: string[] = [];
  for (const currency of requested) {
    if (cached && cache?.rates[currency] > 0) cachedRates[currency] = cache.rates[currency];
    else missing.push(currency);
  }

  let merged = { ...cachedRates };
  if (missing.length) {
    const response = await fetch(buildUrl(missing), { headers: getApiHeaders(), cache: 'no-store' });
    const text = await response.text().catch(() => '');
    let body: any = {};
    try { body = JSON.parse(text); } catch { body = { message: text }; }
    if (!response.ok) {
      throw new Error(`CoinGecko price request failed (${response.status}): ${body?.error || body?.status?.error_message || body?.message || 'Unknown error'}`);
    }
    const pi = body?.[COIN_ID] || {};
    for (const currency of missing) {
      const rate = Number(pi?.[currency]);
      if (Number.isFinite(rate) && rate > 0) merged[currency] = rate;
    }
    const unavailable = requested.filter((currency) => !(merged[currency] > 0));
    if (unavailable.length) throw new Error(`CoinGecko does not currently provide a PI price for: ${unavailable.join(', ')}`);
    cache = { rates: { ...(cache?.rates || {}), ...merged }, updatedAt: now };
  }

  return { rates: merged, source: 'coingecko', updatedAt: new Date(cache?.updatedAt || now).toISOString() };
}

export async function getPiFiatRate(currency: string): Promise<{ rate: number; source: 'coingecko'; updatedAt: string }> {
  const normalized = normalizeCurrency(currency);
  if (!normalized) throw new Error('Fiat currency is required.');
  const result = await getPiFiatRates([normalized]);
  return { rate: result.rates[normalized], source: result.source, updatedAt: result.updatedAt };
}

export async function quoteFiatToPi(amount: number, currency: string) {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Fiat amount must be greater than 0.');
  const normalizedCurrency = normalizeCurrency(currency).toUpperCase();
  const { rate, source, updatedAt } = await getPiFiatRate(normalizedCurrency);
  const piAmount = amount / rate;
  if (!Number.isFinite(piAmount) || piAmount <= 0) throw new Error('Unable to calculate a valid PI quote.');
  return {
    fiatAmount: amount,
    fiatCurrency: normalizedCurrency,
    piAmount: Number(piAmount.toFixed(6)),
    piFiatRate: rate,
    source,
    quotedAt: updatedAt,
    coinId: COIN_ID,
  };
}
