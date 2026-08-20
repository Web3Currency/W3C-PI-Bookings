import { Service } from '../types';
import { piAuthService } from './piAuthService';

function mapService(row: any): Service {
  return {
    id: row.id,
    name: row.title || '',
    category: row.category || 'web_dev',
    description: row.short_description || '',
    fullDescription: row.full_description || '',
    coverImageUrl: row.cover_image || '',
    included: Array.isArray(row.deliverables) ? row.deliverables : [],
    durationMinutes: Number(row.duration) || 60,
    basePrice: Number(row.base_price_ngn) || 0,
    currency: row.currency || 'NGN',
    priceNGN: Number(row.base_price_ngn) || 0,
    pricePi: Number(row.calculated_pi_price) || 0,
    featured: Boolean(row.featured),
    providerName: row.provider_name || '',
    providerRole: row.provider_role || '',
    providerId: row.provider_id || undefined,
    locationType: row.location_type || 'Online / Remote',
    status: row.status || 'Draft',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function request(path: string, init: RequestInit = {}) {
  const user = piAuthService.getStoredUser();
  if (!user?.accessToken) throw new Error('Please sign in with Pi Network first.');
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${user.accessToken}`,
      ...(init.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Provider service request failed.');
  return body;
}

export interface ProviderServiceInput {
  title: string;
  shortDescription: string;
  fullDescription: string;
  coverImage: string;
  deliverables: string[];
  duration: number;
  basePriceNgn: number;
  category: string;
  locationType: string;
  status: 'Draft' | 'Published' | 'Archived';
}

export const providerServiceService = {
  async list(): Promise<Service[]> {
    const body = await request('/api/pi/services');
    return Array.isArray(body.services) ? body.services.map(mapService) : [];
  },

  async create(input: ProviderServiceInput): Promise<Service> {
    const body = await request('/api/pi/services', { method: 'POST', body: JSON.stringify(input) });
    return mapService(body.service);
  },

  async update(serviceId: string, input: ProviderServiceInput): Promise<Service> {
    const body = await request(`/api/pi/services/${encodeURIComponent(serviceId)}`, { method: 'PATCH', body: JSON.stringify(input) });
    return mapService(body.service);
  },
};
