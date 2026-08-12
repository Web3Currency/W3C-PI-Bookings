import { supabase } from '../lib/supabase';

export interface ThemeToken {
  id?: string;
  key: string;
  type: 'solid' | 'gradient' | 'rgba';
  value: string;
  category: 'brand' | 'surface' | 'typography' | 'border' | 'status' | 'gradient';
  metadata?: Record<string, any>;
  description?: string;
  is_active?: boolean;
}

export const DEFAULT_THEME_TOKENS: Record<string, ThemeToken> = {
  // Brand Primary Palette
  'primary': {
    key: 'primary',
    type: 'solid',
    value: '#EA580C',
    category: 'brand',
    description: 'Main brand CTA, active tabs, prices, primary buttons',
  },
  'primary-hover': {
    key: 'primary-hover',
    type: 'solid',
    value: '#F97316',
    category: 'brand',
    description: 'Hover state for primary action buttons',
  },
  'primary-light': {
    key: 'primary-light',
    type: 'solid',
    value: '#FFEDD5',
    category: 'brand',
    description: 'Light background for badges and category pills',
  },
  'primary-subtle': {
    key: 'primary-subtle',
    type: 'solid',
    value: '#FFF7ED',
    category: 'brand',
    description: 'Subtle background tint for trust banners and highlight cards',
  },
  'primary-dark': {
    key: 'primary-dark',
    type: 'solid',
    value: '#C2410C',
    category: 'brand',
    description: 'High-contrast text on light orange surfaces',
  },

  // Surfaces & Backgrounds
  'background': {
    key: 'background',
    type: 'solid',
    value: '#FFFFFF',
    category: 'surface',
    description: 'Global application viewport background',
  },
  'surface': {
    key: 'surface',
    type: 'solid',
    value: '#FFFFFF',
    category: 'surface',
    description: 'Main card containers, modals, and navigation drawers',
  },
  'surface-subtle': {
    key: 'surface-subtle',
    type: 'solid',
    value: '#F4F4F5',
    category: 'surface',
    description: 'Input background fills, secondary card fills',
  },
  'surface-muted': {
    key: 'surface-muted',
    type: 'solid',
    value: '#E4E4E7',
    category: 'surface',
    description: 'Secondary button backgrounds and disabled fills',
  },

  // Typography
  'text-primary': {
    key: 'text-primary',
    type: 'solid',
    value: '#18181B',
    category: 'typography',
    description: 'Primary page headings, bold titles, main price values',
  },
  'text-secondary': {
    key: 'text-secondary',
    type: 'solid',
    value: '#3F3F46',
    category: 'typography',
    description: 'Subtitles, body copy, form labels',
  },
  'text-muted': {
    key: 'text-muted',
    type: 'solid',
    value: '#71717A',
    category: 'typography',
    description: 'Helper text, metadata captions, timestamps',
  },
  'text-placeholder': {
    key: 'text-placeholder',
    type: 'solid',
    value: '#A1A1AA',
    category: 'typography',
    description: 'Input field placeholders, micro-icons',
  },
  'text-on-primary': {
    key: 'text-on-primary',
    type: 'solid',
    value: '#FFFFFF',
    category: 'typography',
    description: 'Text color rendered over primary action buttons',
  },

  // Borders
  'border-subtle': {
    key: 'border-subtle',
    type: 'solid',
    value: '#F4F4F5',
    category: 'border',
    description: 'Soft card dividers and subtle container edges',
  },
  'border-default': {
    key: 'border-default',
    type: 'solid',
    value: '#E4E4E7',
    category: 'border',
    description: 'Standard input borders, table borders, card outlines',
  },
  'border-strong': {
    key: 'border-strong',
    type: 'solid',
    value: '#CBD5E1',
    category: 'border',
    description: 'Active selection rings and focus state borders',
  },

  // Status & Feedback
  'success': {
    key: 'success',
    type: 'solid',
    value: '#059669',
    category: 'status',
    description: 'Completed booking state, escrow release CTAs, verified badges',
  },
  'success-hover': {
    key: 'success-hover',
    type: 'solid',
    value: '#10B981',
    category: 'status',
    description: 'Hover state for success actions',
  },
  'success-subtle': {
    key: 'success-subtle',
    type: 'solid',
    value: '#ECFDF5',
    category: 'status',
    description: 'Success alert card background',
  },
  'warning': {
    key: 'warning',
    type: 'solid',
    value: '#D97706',
    category: 'status',
    description: 'Rating stars, pending booking highlights',
  },
  'warning-subtle': {
    key: 'warning-subtle',
    type: 'solid',
    value: '#FFFBEB',
    category: 'status',
    description: 'Pending warning card background',
  },
  'error': {
    key: 'error',
    type: 'solid',
    value: '#DC2626',
    category: 'status',
    description: 'Reject/Cancel buttons, destructive alert states',
  },
  'error-hover': {
    key: 'error-hover',
    type: 'solid',
    value: '#EF4444',
    category: 'status',
    description: 'Hover state for destructive actions',
  },
  'error-subtle': {
    key: 'error-subtle',
    type: 'solid',
    value: '#FEF2F2',
    category: 'status',
    description: 'Error alert card background',
  },

  // Gradients
  'hero-gradient': {
    key: 'hero-gradient',
    type: 'gradient',
    value: 'linear-gradient(135deg, #EA580C 0%, #F97316 50%, #D97706 100%)',
    category: 'gradient',
    metadata: {
      type: 'linear',
      angle: '135deg',
      stops: [
        { color: '#EA580C', position: '0%' },
        { color: '#F97316', position: '50%' },
        { color: '#D97706', position: '100%' },
      ],
    },
    description: 'Primary marketplace hero banner background gradient',
  },
  'profile-hero-gradient': {
    key: 'profile-hero-gradient',
    type: 'gradient',
    value: 'linear-gradient(135deg, #FFFFFF 0%, rgba(255, 247, 237, 0.4) 50%, rgba(254, 243, 199, 0.4) 100%)',
    category: 'gradient',
    metadata: {
      type: 'linear',
      angle: '135deg',
      stops: [
        { color: '#FFFFFF', position: '0%' },
        { color: 'rgba(255, 247, 237, 0.4)', position: '50%' },
        { color: 'rgba(254, 243, 199, 0.4)', position: '100%' },
      ],
    },
    description: 'Public profile view top header hero gradient',
  },
  'avatar-gradient': {
    key: 'avatar-gradient',
    type: 'gradient',
    value: 'linear-gradient(135deg, #EA580C 0%, #D97706 100%)',
    category: 'gradient',
    metadata: {
      type: 'linear',
      angle: '135deg',
      stops: [
        { color: '#EA580C', position: '0%' },
        { color: '#D97706', position: '100%' },
      ],
    },
    description: 'Avatar user initial fallback badge gradient',
  },
};

const CACHE_KEY = 'w3c_app_theme_tokens';

export class ThemeService {
  /**
   * Applies given design tokens directly to CSS Custom Variables on document.documentElement (:root)
   */
  public static applyTokens(tokens: Record<string, ThemeToken> | ThemeToken[]) {
    const list = Array.isArray(tokens) ? tokens : Object.values(tokens);
    const root = document.documentElement;

    console.group('🎨 [ThemeService] Applying theme tokens to document.documentElement (:root)');
    list.forEach((token) => {
      if (token && token.key) {
        const rawVal = token.value !== undefined && token.value !== null ? String(token.value).trim() : '';
        // If inactive or empty string or 'none', set to 'none' so CSS handles it properly
        const finalVal = (token.is_active === false || rawVal === '' || rawVal.toLowerCase() === 'none') ? 'none' : rawVal;
        
        const cssVarName = `--theme-${token.key}`;
        root.style.setProperty(cssVarName, finalVal);

        const appliedComputed = getComputedStyle(root).getPropertyValue(cssVarName).trim();
        console.log(`  └─ Set ${cssVarName} = "${finalVal}" | DOM computed value: "${appliedComputed}"`);
      }
    });
    console.groupEnd();
  }

  /**
   * Loads initial theme: first applies fallback/cached values instantly, then fetches updates from Supabase
   */
  public static async initTheme(): Promise<Record<string, ThemeToken>> {
    console.log('🚀 [ThemeService.initTheme] Initializing application theme...');

    // Expose global console debug helper
    if (typeof window !== 'undefined') {
      (window as any).__debugTheme = () => {
        console.group('🔍 [Theme Debugger] Current CSS Variables on document.documentElement (:root)');
        const root = document.documentElement;
        const computed = getComputedStyle(root);
        Object.keys(DEFAULT_THEME_TOKENS).forEach((key) => {
          const varName = `--theme-${key}`;
          const inlineVal = root.style.getPropertyValue(varName);
          const computedVal = computed.getPropertyValue(varName);
          console.log(`${varName}: inline="${inlineVal}" | computed="${computedVal}"`);
        });
        console.groupEnd();
      };
    }

    // 1. Try to load from localStorage cache first
    let cachedTokens = DEFAULT_THEME_TOKENS;
    try {
      const stored = localStorage.getItem(CACHE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          cachedTokens = { ...DEFAULT_THEME_TOKENS, ...parsed };
          console.log('📦 [ThemeService] Loaded cached theme tokens from localStorage:', cachedTokens);
        }
      }
    } catch (e) {
      console.warn('⚠️ [ThemeService] Failed to parse localStorage cache:', e);
    }

    // Apply cached / default tokens immediately so UI renders without delay
    this.applyTokens(cachedTokens);

    // 2. Fetch fresh tokens from Supabase app_theme_tokens table
    try {
      console.log('📡 [ThemeService] Querying Supabase table `app_theme_tokens`...');
      if (supabase) {
        const { data, error } = await supabase
          .from('app_theme_tokens')
          .select('*');

        if (error) {
          console.error('❌ [ThemeService] Supabase query error:', error.message, error);
        } else if (data && data.length > 0) {
          console.log(`✅ [ThemeService] Successfully fetched ${data.length} theme rows from Supabase:`, data);
          
          const remoteTokens: Record<string, ThemeToken> = { ...DEFAULT_THEME_TOKENS };
          
          data.forEach((row: any) => {
            if (row && row.key) {
              const val = row.value !== undefined && row.value !== null ? String(row.value).trim() : '';
              const isActive = row.is_active ?? true;
              
              remoteTokens[row.key] = {
                id: row.id,
                key: row.key,
                type: row.type || 'solid',
                value: (isActive && val !== '' && val.toLowerCase() !== 'none') ? val : 'none',
                category: row.category || 'brand',
                metadata: row.metadata || undefined,
                description: row.description || undefined,
                is_active: isActive,
              };
            }
          });

          console.log('🎨 [ThemeService] Processed theme tokens from Supabase:', remoteTokens);

          // Apply remote tokens to CSS Custom Properties
          this.applyTokens(remoteTokens);

          // Update localStorage cache
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(remoteTokens));
            console.log('💾 [ThemeService] Updated localStorage theme cache.');
          } catch (e) {
            console.warn('⚠️ [ThemeService] Failed to save cache to localStorage:', e);
          }

          return remoteTokens;
        } else {
          console.log('ℹ️ [ThemeService] Supabase returned 0 rows for `app_theme_tokens`. Keeping defaults.');
        }
      } else {
        console.warn('⚠️ [ThemeService] Supabase client is null/undefined.');
      }
    } catch (e) {
      console.error('❌ [ThemeService] Exception during remote theme fetch:', e);
    }

    return cachedTokens;
  }
}
