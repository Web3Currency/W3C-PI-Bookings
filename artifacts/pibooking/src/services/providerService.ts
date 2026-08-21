import { Provider, PortfolioItem } from '../types';
import { supabase, isSupabaseConfigured, safeSupabaseInsert, safeSupabaseUpdate } from '../lib/supabase';
import { providerMediaService } from './providerMediaService';

const LOCAL_PROVIDERS_KEY = 'w3c_providers';

function getPiAccessToken(): string | undefined {
  try {
    const raw = sessionStorage.getItem('pi_authenticated_user');
    if (!raw) return undefined;
    const user = JSON.parse(raw);
    return typeof user?.accessToken === 'string' ? user.accessToken : undefined;
  } catch { return undefined; }
}

async function invokeProviderProfile(action: 'create' | 'update', body: Record<string, any>, piAccessToken?: string) {
  if (!isSupabaseConfigured() || !piAccessToken) return null;
  const { data, error } = await supabase.functions.invoke('provider-profile', {
    body: { action, ...body },
    headers: { 'x-pi-access-token': piAccessToken, Authorization: `Bearer ${piAccessToken}` },
  });
  if (error) throw new Error(error.message || 'Provider profile request failed.');
  if (!data?.provider) throw new Error(data?.error || 'Provider profile request failed.');
  return data.provider;
}

function mapProviderRow(row: any): Provider {
  const rawPortfolio = row.portfolio_items || row.portfolio_images || [];
  const portfolioItems: PortfolioItem[] = [];
  const portfolioImages: string[] = [];
  if (Array.isArray(rawPortfolio)) rawPortfolio.forEach((item: any, idx: number) => {
    if (typeof item === 'string') {
      try {
        const parsed = JSON.parse(item);
        if (parsed && typeof parsed === 'object') {
          const img = parsed.imageUrl || parsed.path || parsed.url || parsed.image || '';
          if (img) { portfolioItems.push({ id: parsed.id || `port_${idx}`, imageUrl: img, path: parsed.path, caption: parsed.caption || '' }); portfolioImages.push(img); return; }
        }
      } catch {}
      portfolioImages.push(item); portfolioItems.push({ id: `port_${idx}`, imageUrl: item, caption: '' });
    } else if (item && typeof item === 'object') {
      const img = item.imageUrl || item.path || item.url || item.image || '';
      if (img) { portfolioItems.push({ id: item.id || `port_${idx}`, imageUrl: img, path: item.path, caption: item.caption || '' }); portfolioImages.push(img); }
    }
  });
  return {
    id: row.id, fullName: row.full_name || '', piUsername: row.pi_username || undefined, piUid: row.pi_uid || undefined,
    piWalletAddress: row.pi_wallet_address || undefined, roleTitle: row.role_title || '', bio: row.bio || undefined,
    photoUrl: row.photo_url || undefined, portfolioImages, portfolioItems, rating: row.rating != null ? Number(row.rating) : undefined,
    reviewsCount: row.reviews_count != null ? Number(row.reviews_count) : undefined, contactEmail: row.contact_email || undefined,
    contactPhone: row.contact_phone || undefined, status: row.status || 'Approved', createdAt: row.created_at, updatedAt: row.updated_at,
    usernameSlug: row.username_slug || undefined, headline: row.headline || undefined,
    specialties: Array.isArray(row.specialties) ? row.specialties : [], skills: Array.isArray(row.skills) ? row.skills : [],
    experienceLevel: row.experience_level || undefined, yearsExperience: row.years_experience != null ? Number(row.years_experience) : undefined,
    availabilityStatus: row.availability_status || undefined, responseTime: row.response_time || undefined,
    languages: Array.isArray(row.languages) ? row.languages : [], serviceMode: row.service_mode || undefined,
    profileVerified: row.profile_verified ?? undefined, piVerified: row.pi_verified ?? undefined, location: row.location || undefined,
    website: row.website || undefined, socialLinks: Array.isArray(row.social_links) ? row.social_links : [], profileVisibility: row.profile_visibility || 'public',
  };
}

function normalizeExperienceLevel(value: string | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  const map: Record<string, string> = {
    'entry level': 'beginner', entry: 'beginner', beginner: 'beginner',
    intermediate: 'intermediate',
    senior: 'advanced', advanced: 'advanced',
    'senior / expert': 'expert', expert: 'expert',
  };
  return map[normalized] || 'intermediate';
}

function normalizeServiceMode(value: string | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  const map: Record<string, string> = {
    remote: 'remote', 'remote / online': 'remote', online: 'remote',
    onsite: 'onsite', 'on-site': 'onsite', 'on-site / in-person': 'onsite', 'in-person': 'onsite',
    hybrid: 'hybrid',
  };
  return map[normalized] || 'remote';
}

function providerPayload(provider: Provider) {
  return {
    id: provider.id, full_name: provider.fullName, pi_username: provider.piUsername || null, pi_uid: provider.piUid || null,
    pi_wallet_address: provider.piWalletAddress || null, role_title: provider.roleTitle, bio: provider.bio || null,
    photo_url: provider.photoUrl || null, portfolio_images: provider.portfolioImages || [], portfolio_items: provider.portfolioItems || [],
    contact_email: provider.contactEmail || null, contact_phone: provider.contactPhone || null, status: provider.status || 'Approved',
    username_slug: provider.usernameSlug || null, headline: provider.headline || null, specialties: provider.specialties || [],
    skills: provider.skills || [], experience_level: normalizeExperienceLevel(provider.experienceLevel),
    years_experience: typeof provider.yearsExperience === 'number' && !isNaN(provider.yearsExperience) ? provider.yearsExperience : null,
    availability_status: provider.availabilityStatus || 'available', response_time: provider.responseTime || null,
    languages: provider.languages || [], service_mode: normalizeServiceMode(provider.serviceMode), location: provider.location || null,
    website: provider.website || null, social_links: provider.socialLinks || [], profile_visibility: provider.profileVisibility || 'public',
  };
}

export const providerService = {
  getProvidersLocal(): Provider[] { const cached = localStorage.getItem(LOCAL_PROVIDERS_KEY); if (!cached) return []; try { return JSON.parse(cached); } catch { return []; } },
  async getProvidersAsync(): Promise<Provider[]> {
    const localProviders = this.getProvidersLocal(); if (!isSupabaseConfigured()) return localProviders;
    try {
      const { data, error } = await supabase.from('providers').select('*').order('created_at', { ascending: true });
      if (error) return localProviders;
      if (!data || data.length === 0) { localStorage.setItem(LOCAL_PROVIDERS_KEY, JSON.stringify([])); return []; }
      const remoteProviders = data.map(mapProviderRow); localStorage.setItem(LOCAL_PROVIDERS_KEY, JSON.stringify(remoteProviders)); return remoteProviders;
    } catch { return localProviders; }
  },
  async getProviderByPiUid(piUid: string): Promise<Provider | null> { const all = await this.getProvidersAsync(); return all.find((p) => p.piUid === piUid) || null; },
  async addProvider(provider: Omit<Provider, 'id'>, piAccessToken?: string): Promise<Provider> {
    const generatedUuid = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `prv_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newProvider: Provider = { ...provider, id: (provider as any).id && (provider as any).id.length > 10 ? (provider as any).id : generatedUuid, status: provider.status || 'Approved', createdAt: new Date().toISOString() };
    const token = piAccessToken || getPiAccessToken();
    if (isSupabaseConfigured()) {
      const payload = providerPayload(newProvider);
      const remote = await invokeProviderProfile('create', { provider: payload }, token);
      if (remote) { const saved = mapProviderRow(remote); const current = this.getProvidersLocal().filter((p) => p.piUid !== saved.piUid); localStorage.setItem(LOCAL_PROVIDERS_KEY, JSON.stringify([...current, saved])); return saved; }
      const { data, error } = await safeSupabaseInsert('providers', payload);
      if (error) throw new Error(`Provider could not be saved: ${error.message}`);
      if (data?.[0]) newProvider.id = data[0].id;
    }
    const currentProviders = this.getProvidersLocal(); localStorage.setItem(LOCAL_PROVIDERS_KEY, JSON.stringify([...currentProviders, newProvider])); return newProvider;
  },
  async updateProvider(providerId: string, updates: Partial<Provider>, piAccessToken?: string): Promise<void> {
    if (isSupabaseConfigured()) {
      const payload: Record<string, any> = { updated_at: new Date().toISOString() };
      const map: Record<string, string> = { fullName:'full_name', piUsername:'pi_username', piWalletAddress:'pi_wallet_address', roleTitle:'role_title', photoUrl:'photo_url', bio:'bio', contactEmail:'contact_email', contactPhone:'contact_phone', status:'status', usernameSlug:'username_slug', headline:'headline', specialties:'specialties', skills:'skills', experienceLevel:'experience_level', yearsExperience:'years_experience', availabilityStatus:'availability_status', responseTime:'response_time', languages:'languages', serviceMode:'service_mode', profileVerified:'profile_verified', piVerified:'pi_verified', location:'location', website:'website', socialLinks:'social_links', profileVisibility:'profile_visibility', portfolioImages:'portfolio_images', portfolioItems:'portfolio_items' };
      Object.entries(updates).forEach(([key, value]) => { if (map[key] && value !== undefined) payload[map[key]] = value; });
      if ('experienceLevel' in updates) payload.experience_level = normalizeExperienceLevel(updates.experienceLevel);
      if ('serviceMode' in updates) payload.service_mode = normalizeServiceMode(updates.serviceMode);
      const token = piAccessToken || getPiAccessToken();
      if (token) {
        const remote = await invokeProviderProfile('update', { providerId, updates: payload }, token);
        if (remote) { const saved = mapProviderRow(remote); localStorage.setItem(LOCAL_PROVIDERS_KEY, JSON.stringify(this.getProvidersLocal().map((p) => p.id === providerId ? saved : p))); return; }
      }
      const { error } = await safeSupabaseUpdate('providers', payload, 'id', providerId);
      if (error) throw new Error(`Provider could not be updated: ${error.message}`);
    }
    const currentProviders = this.getProvidersLocal(); localStorage.setItem(LOCAL_PROVIDERS_KEY, JSON.stringify(currentProviders.map((p) => p.id === providerId ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p)));
  },
  async uploadProviderPhoto(providerId: string, file: File): Promise<string | null> {
    const token = getPiAccessToken();
    const result = await providerMediaService.uploadProfilePhoto(file, { providerIdentifier: providerId, piAccessToken: token });
    return result.path || result.publicUrl;
  }
};