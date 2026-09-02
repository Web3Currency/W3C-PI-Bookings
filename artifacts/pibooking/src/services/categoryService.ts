import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface ServiceCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  displayOrder: number;
  isFeatured: boolean;
  isActive: boolean;
}

function mapCategory(row: any): ServiceCategory {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description || undefined,
    icon: row.icon || undefined,
    displayOrder: Number(row.display_order) || 0,
    isFeatured: Boolean(row.is_featured),
    isActive: row.is_active !== false,
  };
}

const categoryService = {
  async listActive(): Promise<ServiceCategory[]> {
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase
      .from('service_categories')
      .select('id,name,slug,description,icon,display_order,is_featured,is_active')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    if (error) throw new Error(error.message || 'Unable to load marketplace categories.');
    return (data || []).map(mapCategory);
  },
};

export { categoryService };
