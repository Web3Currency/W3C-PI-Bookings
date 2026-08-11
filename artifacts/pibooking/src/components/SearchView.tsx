import React, { useState, useEffect } from 'react';
import { Service } from '../types';
import { Search, X, SlidersHorizontal, ArrowUpDown, Clock, Tag, CheckCircle2 } from 'lucide-react';

interface SearchViewProps {
  services?: Service[];
  onSelectService?: (service: Service) => void;
  initialQuery?: string;
  initialCategory?: string;
}

const DEFAULT_CATEGORY_LABELS: Record<string, string> = {
  landing_page: 'Landing Pages',
  web_dev: 'Websites & Apps',
  ux_design: 'UI/UX & Audits',
  pi_sdk: 'Pi SDK & Web3',
  branding: 'Graphics & Branding',
  marketing: 'Digital Marketing',
  consulting: 'Consulting & Strategy',
};

type SortOption = 'relevance' | 'price_low' | 'price_high' | 'duration';

export const SearchView: React.FC<SearchViewProps> = ({
  services = [],
  onSelectService,
  initialQuery = '',
  initialCategory = 'all',
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [sortBy, setSortBy] = useState<SortOption>('relevance');

  useEffect(() => {
    if (initialQuery !== undefined) setQuery(initialQuery);
    if (initialCategory !== undefined) setSelectedCategory(initialCategory);
  }, [initialQuery, initialCategory]);

  // Compute categories dynamically from services
  const uniqueCategories: string[] = Array.from(
    new Set(services.map((s) => String(s.category)))
  );

  const categoriesList = [
    { id: 'all', label: 'All Services' },
    ...uniqueCategories.map((catId) => ({
      id: catId,
      label:
        DEFAULT_CATEGORY_LABELS[catId] ||
        catId.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
    })),
  ];

  // Filtering
  const filtered = services.filter((s) => {
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q ||
      s.name.toLowerCase().includes(q) ||
      (s.description && s.description.toLowerCase().includes(q)) ||
      (s.category && s.category.toLowerCase().includes(q)) ||
      (s.providerName && s.providerName.toLowerCase().includes(q)) ||
      (s.included && s.included.some((inc) => inc.toLowerCase().includes(q)));

    const matchesCategory =
      selectedCategory === 'all' || s.category === selectedCategory;

    return matchesQuery && matchesCategory;
  });

  // Sorting
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'price_low') return a.pricePi - b.pricePi;
    if (sortBy === 'price_high') return b.pricePi - a.pricePi;
    if (sortBy === 'duration') return a.durationMinutes - b.durationMinutes;
    return 0; // relevance / default order
  });

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-200">
      {/* 1. HERO BANNER */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-orange-600 via-orange-500 to-amber-600 text-white p-6 sm:p-8 shadow-lg space-y-4">
        <div className="max-w-xl space-y-2">
          <div className="inline-block px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-extrabold uppercase tracking-widest text-orange-50">
            W3C Service Marketplace
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
            Search Digital Services
          </h1>

          <p className="text-xs sm:text-sm text-orange-100 font-medium leading-relaxed">
            Filter by skill, service scope, or category to book verified Pi Network professionals.
          </p>
        </div>
      </div>

      {/* 2. SEARCH BAR & FILTERS CARD */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white shadow-sm space-y-4">
        {/* Main Input Row */}
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center px-4 py-3 rounded-2xl bg-zinc-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-orange-500/20 transition shadow-inner">
            <Search className="w-4 h-4 text-zinc-400 shrink-0 mr-2.5" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search services, keywords, deliverables..."
              className="w-full text-zinc-900 placeholder-zinc-400 text-xs sm:text-sm font-medium bg-transparent focus:outline-none"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200/60 transition cursor-pointer"
                title="Clear input"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="relative shrink-0">
            <div className="flex items-center gap-1.5 px-3 py-3 rounded-2xl bg-zinc-50 text-zinc-700 text-xs font-bold border border-zinc-100">
              <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-transparent text-xs font-bold text-zinc-800 focus:outline-none cursor-pointer pr-1"
              >
                <option value="relevance">Sort: Featured</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
                <option value="duration">Fastest Delivery</option>
              </select>
            </div>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
          <span className="text-[11px] text-zinc-400 font-extrabold uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
            <Tag className="w-3 h-3" /> Categories:
          </span>
          {categoriesList.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition shrink-0 cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-orange-600 text-white shadow-2xs'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-orange-50/80 hover:text-orange-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. RESULTS SUMMARY BAR */}
      <div className="flex items-center justify-between px-1 text-xs font-bold text-zinc-500">
        <span>
          {sorted.length} {sorted.length === 1 ? 'SERVICE AVAILABLE' : 'SERVICES AVAILABLE'}
        </span>
        {(query || selectedCategory !== 'all') && (
          <button
            onClick={() => {
              setQuery('');
              setSelectedCategory('all');
            }}
            className="text-orange-600 hover:text-orange-700 font-extrabold cursor-pointer"
          >
            Reset Filters ×
          </button>
        )}
      </div>

      {/* 4. RESULTS GRID */}
      {sorted.length === 0 ? (
        <div className="p-10 text-center bg-white rounded-3xl shadow-sm space-y-3 border border-zinc-100">
          <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-base font-black text-zinc-900 tracking-tight">
            No matching services found
          </h3>
          <p className="text-xs text-zinc-500 font-medium max-w-sm mx-auto leading-relaxed">
            We couldn't find any service offerings matching "{query}". Try checking your spelling or clearing your filter selections.
          </p>
          <button
            onClick={() => {
              setQuery('');
              setSelectedCategory('all');
            }}
            className="mt-2 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-black text-xs transition cursor-pointer shadow-xs"
          >
            Clear Search & Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {sorted.map((service) => (
            <div
              key={service.id}
              onClick={() => onSelectService?.(service)}
              id={`search-service-card-${service.id}`}
              className="group p-5 rounded-2xl bg-white shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4 border border-zinc-100/60"
            >
              <div className="space-y-3">
                {/* Header Badge Row */}
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-block px-3 py-1 rounded-full bg-orange-100/80 text-orange-950 text-[10px] font-extrabold uppercase tracking-wider">
                    {service.category.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[11px] text-zinc-500 font-bold flex items-center gap-1">
                    <Clock className="w-3 h-3 text-zinc-400" />
                    {service.durationMinutes} mins
                  </span>
                </div>

                {/* Service Title */}
                <h3 className="font-extrabold text-base text-zinc-900 group-hover:text-orange-600 transition leading-snug line-clamp-2">
                  {service.name}
                </h3>

                {/* Service Description */}
                {service.description && (
                  <p className="text-xs text-zinc-600 line-clamp-2 leading-relaxed font-normal">
                    {service.description}
                  </p>
                )}

                {/* Included Key Deliverables */}
                {service.included && service.included.length > 0 && (
                  <div className="pt-1 space-y-1">
                    {service.included.slice(0, 2).map((item, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-medium">
                        <CheckCircle2 className="w-3 h-3 text-orange-600 shrink-0" />
                        <span className="truncate">{item}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Provider & Price Footer */}
              <div className="pt-3 border-t border-zinc-100 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block">Price</span>
                  <span className="text-lg font-black text-orange-600 tracking-tight">
                    {service.pricePi} <span className="text-xs font-bold text-orange-500">π</span>
                  </span>
                </div>

                <button
                  type="button"
                  className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-black text-xs transition cursor-pointer shadow-xs shrink-0"
                >
                  Book Service
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
