import React, { useEffect, useMemo, useState } from 'react';
import { Service, Provider } from '../types';
import { providerService } from '../services/providerService';
import { Search, X, ArrowUpDown, Clock, CheckCircle2, Star, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';

interface SearchViewProps {
  services?: Service[];
  onSelectService?: (service: Service) => void;
  onSelectProvider?: (provider: Provider) => void;
  onBecomeProvider?: () => void;
  initialQuery?: string;
}

type ViewMode = 'services' | 'providers';
type ServiceSort = 'featured' | 'newest' | 'price_low' | 'price_high' | 'duration';
type ProviderSort = 'featured' | 'rating' | 'reviews' | 'newest' | 'name';

type HeroSlide = {
  eyebrow: string;
  title: string;
  description: string;
  cta: string;
  action: 'services' | 'providers' | 'become';
};

const HERO_SLIDES: HeroSlide[] = [
  {
    eyebrow: 'W3C Digital Network',
    title: 'Find what you need — or who can provide it.',
    description: 'Discover bookable digital services and verified Pi Network providers in one marketplace.',
    cta: 'Explore Services',
    action: 'services',
  },
  {
    eyebrow: 'How W3C Pi Bookings Works',
    title: 'Discover. Book. Work together.',
    description: 'Find a service, review the provider, and start a booking through the existing W3C flow.',
    cta: 'Browse Services',
    action: 'services',
  },
  {
    eyebrow: 'For Providers',
    title: 'Put your skills in front of clients.',
    description: 'Build your provider presence and offer services through the W3C marketplace.',
    cta: 'Become a Provider',
    action: 'become',
  },
  {
    eyebrow: 'Meet the Community',
    title: 'Search for the right provider directly.',
    description: 'Switch to Providers to explore people by role, skills, specialties, ratings, and more.',
    cta: 'Find Providers',
    action: 'providers',
  },
];

function text(value: unknown): string {
  return typeof value === 'string' ? value.toLowerCase() : '';
}

function providerSearchText(provider: Provider): string {
  return [
    provider.fullName,
    provider.piUsername,
    provider.roleTitle,
    provider.headline,
    provider.bio,
    ...(provider.specialties || []),
    ...(provider.skills || []),
    ...(provider.languages || []),
    provider.location,
  ].filter(Boolean).join(' ').toLowerCase();
}

function serviceSearchText(service: Service): string {
  return [
    service.name,
    service.description,
    service.category,
    service.providerName,
    service.providerRole,
    ...(service.included || []),
  ].filter(Boolean).join(' ').toLowerCase();
}

export const SearchView: React.FC<SearchViewProps> = ({
  services = [],
  onSelectService,
  onSelectProvider,
  onBecomeProvider,
  initialQuery = '',
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('services');
  const [query, setQuery] = useState(initialQuery);
  const [serviceSort, setServiceSort] = useState<ServiceSort>('featured');
  const [providerSort, setProviderSort] = useState<ProviderSort>('featured');
  const [providers, setProviders] = useState<Provider[]>([]);
  const [providersLoading, setProvidersLoading] = useState(false);
  const [providersError, setProvidersError] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => setQuery(initialQuery || ''), [initialQuery]);

  useEffect(() => {
    let active = true;
    setProvidersLoading(true);
    setProvidersError(false);
    providerService.getProvidersAsync().then((data) => {
      if (active) setProviders(data);
    }).catch(() => {
      if (active) setProvidersError(true);
    }).finally(() => {
      if (active) setProvidersLoading(false);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setSlideIndex((current) => (current + 1) % HERO_SLIDES.length), 6500);
    return () => window.clearInterval(timer);
  }, []);

  const currentSlide = HERO_SLIDES[slideIndex];

  const filteredServices = useMemo(() => {
    const q = query.trim().toLowerCase();
    return services.filter((service) => !q || serviceSearchText(service).includes(q));
  }, [services, query]);

  const sortedServices = useMemo(() => [...filteredServices].sort((a, b) => {
    if (serviceSort === 'price_low') return a.pricePi - b.pricePi;
    if (serviceSort === 'price_high') return b.pricePi - a.pricePi;
    if (serviceSort === 'duration') return a.durationMinutes - b.durationMinutes;
    if (serviceSort === 'newest') return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
    if (serviceSort === 'featured') return Number(b.featured) - Number(a.featured);
    return 0;
  }), [filteredServices, serviceSort]);

  const filteredProviders = useMemo(() => {
    const q = query.trim().toLowerCase();
    return providers.filter((provider) => !q || providerSearchText(provider).includes(q));
  }, [providers, query]);

  const sortedProviders = useMemo(() => [...filteredProviders].sort((a, b) => {
    if (providerSort === 'rating') return (b.rating || 0) - (a.rating || 0);
    if (providerSort === 'reviews') return (b.reviewsCount || 0) - (a.reviewsCount || 0);
    if (providerSort === 'newest') return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
    if (providerSort === 'name') return a.fullName.localeCompare(b.fullName);
    const featuredScore = (provider: Provider) => Number(provider.profileVerified || provider.piVerified || provider.status === 'Approved');
    return featuredScore(b) - featuredScore(a);
  }), [filteredProviders, providerSort]);

  const resultCount = viewMode === 'services' ? sortedServices.length : sortedProviders.length;

  const handleModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    setQuery('');
  };

  const handleSlideAction = () => {
    if (currentSlide.action === 'services') handleModeChange('services');
    else if (currentSlide.action === 'providers') handleModeChange('providers');
    else onBecomeProvider?.();
  };

  return (
    <div className="space-y-5 pb-20 animate-in fade-in duration-200">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-600 via-orange-500 to-amber-600 text-white shadow-lg">
        <div className="min-h-[250px] sm:min-h-[230px] p-6 sm:p-8 flex flex-col justify-between gap-7">
          <div className="max-w-2xl space-y-2">
            <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-orange-100">{currentSlide.eyebrow}</div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">{currentSlide.title}</h1>
            <p className="max-w-xl text-xs sm:text-sm text-orange-50/90 font-medium leading-relaxed">{currentSlide.description}</p>
          </div>
          <div className="flex items-end justify-between gap-4">
            <button type="button" onClick={handleSlideAction} className="rounded-xl bg-white px-4 py-2.5 text-xs font-black text-orange-700 shadow-sm hover:bg-orange-50 transition">
              {currentSlide.cta}
            </button>
            <div className="flex items-center gap-1.5">
              <button type="button" aria-label="Previous slide" onClick={() => setSlideIndex((slideIndex - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)} className="p-2 rounded-full bg-white/15 hover:bg-white/25 transition"><ChevronLeft className="w-4 h-4" /></button>
              {HERO_SLIDES.map((_, index) => <button key={index} type="button" aria-label={`Go to slide ${index + 1}`} onClick={() => setSlideIndex(index)} className={`h-1.5 rounded-full transition-all ${index === slideIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/45'}`} />)}
              <button type="button" aria-label="Next slide" onClick={() => setSlideIndex((slideIndex + 1) % HERO_SLIDES.length)} className="p-2 rounded-full bg-white/15 hover:bg-white/25 transition"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex justify-center">
          <div className="inline-flex rounded-full bg-zinc-100 p-1 border border-zinc-200/80" role="tablist" aria-label="Marketplace discovery mode">
            <button type="button" role="tab" aria-selected={viewMode === 'services'} onClick={() => handleModeChange('services')} className={`min-w-28 sm:min-w-32 px-5 py-2.5 rounded-full text-xs font-black transition ${viewMode === 'services' ? 'bg-white text-orange-700 shadow-sm' : 'text-zinc-500 hover:text-zinc-800'}`}>Services</button>
            <button type="button" role="tab" aria-selected={viewMode === 'providers'} onClick={() => handleModeChange('providers')} className={`min-w-28 sm:min-w-32 px-5 py-2.5 rounded-full text-xs font-black transition ${viewMode === 'providers' ? 'bg-white text-orange-700 shadow-sm' : 'text-zinc-500 hover:text-zinc-800'}`}>Providers</button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 flex items-center px-4 py-3 rounded-2xl bg-white border border-zinc-200 focus-within:border-orange-300 focus-within:ring-2 focus-within:ring-orange-500/10 transition">
            <Search className="w-4 h-4 text-zinc-400 shrink-0 mr-2.5" />
            <input type="text" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={viewMode === 'services' ? 'Search services, keywords, delivery...' : 'Search providers, skills, specialties...'} className="w-full text-zinc-900 placeholder-zinc-400 text-xs sm:text-sm font-medium bg-transparent focus:outline-none" />
            {query && <button type="button" onClick={() => setQuery('')} className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 transition" title="Clear search"><X className="w-4 h-4" /></button>}
          </div>
          <div className="flex items-center gap-1.5 px-3 py-3 rounded-2xl bg-white border border-zinc-200 text-zinc-700 text-xs font-bold sm:w-auto">
            <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            {viewMode === 'services' ? (
              <select value={serviceSort} onChange={(event) => setServiceSort(event.target.value as ServiceSort)} className="bg-transparent text-xs font-bold text-zinc-800 focus:outline-none cursor-pointer">
                <option value="featured">Featured</option><option value="newest">Newest</option><option value="price_low">Price: Low to High</option><option value="price_high">Price: High to Low</option><option value="duration">Fastest Delivery</option>
              </select>
            ) : (
              <select value={providerSort} onChange={(event) => setProviderSort(event.target.value as ProviderSort)} className="bg-transparent text-xs font-bold text-zinc-800 focus:outline-none cursor-pointer">
                <option value="featured">Featured</option><option value="rating">Highest Rated</option><option value="reviews">Most Reviews</option><option value="newest">Newest</option><option value="name">A–Z</option>
              </select>
            )}
          </div>
        </div>
      </section>

      <div className="flex items-center justify-between px-1 text-xs font-bold text-zinc-500">
        <span>{resultCount} {viewMode === 'services' ? (resultCount === 1 ? 'SERVICE AVAILABLE' : 'SERVICES AVAILABLE') : (resultCount === 1 ? 'PROVIDER AVAILABLE' : 'PROVIDERS AVAILABLE')}</span>
        {query && <button type="button" onClick={() => setQuery('')} className="text-orange-600 hover:text-orange-700 font-extrabold">Clear Search ×</button>}
      </div>

      {viewMode === 'services' ? (
        sortedServices.length === 0 ? (
          <EmptyState type="services" query={query} onClear={() => setQuery('')} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 divide-y sm:divide-y-0">
            {sortedServices.map((service) => (
              <article key={service.id} onClick={() => onSelectService?.(service)} className="group py-5 sm:p-5 border-zinc-200 sm:border sm:rounded-2xl cursor-pointer hover:bg-zinc-50/60 transition">
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[10px] font-extrabold uppercase tracking-wider text-orange-600 mb-1">{String(service.category).replace(/_/g, ' ')}</div>
                      <h2 className="text-base font-black text-zinc-900 group-hover:text-orange-600 transition line-clamp-2">{service.name}</h2>
                    </div>
                    <span className="text-base font-black text-orange-600 shrink-0">{service.pricePi} <span className="text-xs">π</span></span>
                  </div>
                  {service.description && <p className="text-xs text-zinc-600 leading-relaxed line-clamp-2">{service.description}</p>}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-500 font-semibold">
                    {service.providerName && <span>{service.providerName}</span>}
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{service.durationMinutes} mins</span>
                    {service.provider?.rating != null && <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-current text-amber-500" />{service.provider.rating.toFixed(1)}</span>}
                  </div>
                  {service.included?.length > 0 && <div className="flex flex-wrap gap-1.5">{service.included.slice(0, 3).map((item, index) => <span key={index} className="text-[10px] font-semibold text-zinc-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-orange-500" />{item}</span>)}</div>}
                  <button type="button" onClick={(event) => { event.stopPropagation(); onSelectService?.(service); }} className="self-start px-4 py-2 rounded-xl bg-orange-600 text-white text-xs font-black hover:bg-orange-500 transition">Book Service</button>
                </div>
              </article>
            ))}
          </div>
        )
      ) : providersLoading ? (
        <div className="py-14 text-center text-xs font-bold text-zinc-500">Loading providers...</div>
      ) : providersError ? (
        <div className="py-14 text-center text-xs font-bold text-zinc-500">We couldn't load providers right now. Please try again.</div>
      ) : sortedProviders.length === 0 ? (
        <EmptyState type="providers" query={query} onClear={() => setQuery('')} />
      ) : (
        <div className="divide-y divide-zinc-200">
          {sortedProviders.map((provider) => (
            <article key={provider.id} onClick={() => onSelectProvider?.(provider)} className="group py-5 flex flex-col sm:flex-row sm:items-center gap-4 cursor-pointer hover:bg-zinc-50/60 transition px-1 sm:px-2">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {provider.photoUrl ? <img src={provider.photoUrl} alt={provider.fullName} className="w-14 h-14 rounded-2xl object-cover shrink-0 border border-zinc-200" /> : <div className="w-14 h-14 rounded-2xl bg-orange-100 text-orange-700 flex items-center justify-center text-lg font-black shrink-0">{provider.fullName.charAt(0).toUpperCase() || 'P'}</div>}
                <div className="min-w-0">
                  <h2 className="text-sm font-black text-zinc-900 group-hover:text-orange-600 transition truncate">{provider.fullName}</h2>
                  <p className="text-xs font-semibold text-zinc-500 truncate">{provider.roleTitle}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-[10px] font-semibold text-zinc-500">
                    {provider.rating != null && <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-current text-amber-500" />{provider.rating.toFixed(1)}</span>}
                    {provider.reviewsCount != null && <span>{provider.reviewsCount} reviews</span>}
                    {provider.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{provider.location}</span>}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 sm:max-w-xs">{(provider.specialties || provider.skills || []).slice(0, 3).map((skill) => <span key={skill} className="px-2 py-1 rounded-full bg-zinc-100 text-[10px] font-bold text-zinc-600">{skill}</span>)}</div>
              <button type="button" onClick={(event) => { event.stopPropagation(); onSelectProvider?.(provider); }} className="self-start sm:self-auto px-4 py-2 rounded-xl border border-zinc-200 bg-white text-zinc-800 text-xs font-black hover:border-orange-300 hover:text-orange-700 transition">View Profile</button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

const EmptyState: React.FC<{ type: ViewMode; query: string; onClear: () => void }> = ({ type, query, onClear }) => (
  <div className="py-14 text-center space-y-3">
    <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mx-auto"><Search className="w-6 h-6" /></div>
    <h3 className="text-base font-black text-zinc-900">No {type} found</h3>
    <p className="text-xs text-zinc-500 font-medium max-w-sm mx-auto leading-relaxed">{query ? `We couldn't find any ${type} matching “${query}”. Try another search.` : `There are no ${type} available right now.`}</p>
    {query && <button type="button" onClick={onClear} className="px-5 py-2.5 rounded-xl bg-orange-600 text-white font-black text-xs">Clear Search</button>}
  </div>
);
