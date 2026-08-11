import React, { useEffect, useState } from 'react';
import { Service, BusinessProfile, Provider } from '../types';
import { MerchantCard } from './MerchantCard';
import { providerService } from '../services/providerService';

interface ServiceBrowserProps {
  business: BusinessProfile;
  services?: Service[];
  onSelectService?: (service: Service) => void;
  onOpenAbout: (merchant?: BusinessProfile | Provider) => void;
  onOpenSearch?: (query?: string, category?: string) => void;
}

const CATEGORIES = [
  { id: 'web_dev', label: 'Web & Apps' },
  { id: 'ux_design', label: 'UI/UX Design' },
  { id: 'pi_sdk', label: 'Pi & Web3' },
  { id: 'branding', label: 'Graphics & Brand' },
  { id: 'marketing', label: 'Digital Marketing' },
  { id: 'consulting', label: 'Consulting & Strategy' },
];

export const ServiceBrowser: React.FC<ServiceBrowserProps> = ({
  business,
  services = [],
  onSelectService,
  onOpenAbout,
  onOpenSearch,
}) => {
  const [providers, setProviders] = useState<Provider[]>(() => providerService.getProvidersLocal());
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let isMounted = true;
    providerService.getProvidersAsync().then((data) => {
      if (isMounted && data) {
        setProviders(data);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter public approved providers
  const publicProviders = providers.filter(
    (p) => p.status === 'Approved' && p.profileVisibility !== 'private'
  );

  // Top providers
  const topProviders = publicProviders.slice(0, 4);

  // Rising providers
  const risingProviders = publicProviders.length > 4 ? publicProviders.slice(4) : [];

  // Published services
  const publishedServices = services.filter((s) => s.status === 'Published');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onOpenSearch) {
      onOpenSearch(searchQuery.trim());
    }
  };

  const handleCategoryClick = (categoryId: string) => {
    if (onOpenSearch) {
      onOpenSearch('', categoryId);
    }
  };

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-200">
      {/* 1. MARKETPLACE HERO SECTION */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-orange-600 via-orange-500 to-amber-600 text-white p-6 sm:p-10 shadow-lg space-y-6">
        <div className="relative z-10 max-w-xl space-y-3">
          <div className="inline-block px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-extrabold uppercase tracking-widest text-orange-50">
            W3C Service Marketplace
          </div>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
            Find & book expert digital services natively with Pi
          </h1>

          <p className="text-xs sm:text-sm text-orange-100 leading-relaxed font-medium">
            Connect with verified Web3 developers, UI/UX designers, and digital professionals. Secure bookings with smart Pi Escrow protection.
          </p>
        </div>

        {/* Marketplace Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative z-10 max-w-xl">
          <div className="flex items-center p-1.5 rounded-2xl bg-white shadow-xl">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Try 'web development', 'UI design', 'Pi SDK'..."
              className="flex-1 px-4 py-2.5 text-zinc-900 placeholder-zinc-400 text-xs sm:text-sm font-medium bg-transparent focus:outline-none"
            />
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-black text-xs transition active:scale-95 cursor-pointer shrink-0 shadow-sm"
            >
              Search
            </button>
          </div>
        </form>

        {/* Hero Quick Category Pills */}
        <div className="relative z-10 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs font-bold text-orange-100">
          <span className="text-[11px] text-orange-200 shrink-0 font-extrabold uppercase tracking-wider">Popular:</span>
          {CATEGORIES.slice(0, 4).map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleCategoryClick(cat.id)}
              className="px-3 py-1 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-xs transition shrink-0 cursor-pointer text-white text-xs font-semibold"
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. CATEGORY DISCOVERY GRID */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-black uppercase tracking-wider text-zinc-500">
            Explore Categories
          </h2>
          <button
            onClick={() => onOpenSearch && onOpenSearch('')}
            className="text-xs font-black text-orange-600 hover:text-orange-700 cursor-pointer"
          >
            All Categories →
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat.id)}
              id={`cat-btn-${cat.id}`}
              className="p-4 rounded-2xl bg-zinc-50 hover:bg-orange-50/60 shadow-xs hover:shadow-sm transition text-left space-y-1 active:scale-95 cursor-pointer"
            >
              <span className="text-xs font-black text-zinc-900 block tracking-tight">
                {cat.label}
              </span>
              <span className="text-[11px] font-semibold text-orange-600 block">
                Browse listings
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. FEATURED / TOP PROVIDERS SECTION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-base font-black text-zinc-900 tracking-tight">
              Top Service Providers
            </h2>
            <p className="text-xs text-zinc-500 font-medium">
              Verified professionals and team leads on the W3C network
            </p>
          </div>
        </div>

        {/* Horizontal scroll container for discovery cards */}
        <div className="flex gap-4 overflow-x-auto pb-4 pt-1 px-1 snap-x snap-mandatory scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
          {topProviders.map((provider) => (
            <MerchantCard
              key={provider.id}
              merchant={provider}
              services={publishedServices}
              onOpenAbout={onOpenAbout}
              className="w-[290px] sm:w-[330px] shrink-0 snap-start"
            />
          ))}
        </div>
      </div>

      {/* 4. POPULAR SERVICES / LISTINGS SECTION */}
      {publishedServices.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-base font-black text-zinc-900 tracking-tight">
                Popular Service Offerings
              </h2>
              <p className="text-xs text-zinc-500 font-medium">
                Fixed-scope digital services ready for direct booking
              </p>
            </div>
            <button
              onClick={() => onOpenSearch && onOpenSearch('')}
              className="text-xs font-black text-orange-600 hover:text-orange-700 cursor-pointer"
            >
              View All Services →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {publishedServices.slice(0, 4).map((service) => (
              <div
                key={service.id}
                onClick={() => onSelectService?.(service)}
                id={`home-service-card-${service.id}`}
                className="group p-5 rounded-2xl bg-white shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-block px-3 py-1 rounded-full bg-orange-100/70 text-orange-950 text-[10px] font-extrabold uppercase tracking-wider">
                      {service.category.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[11px] text-zinc-500 font-bold">
                      {service.durationMinutes} mins
                    </span>
                  </div>

                  <h3 className="font-extrabold text-sm sm:text-base text-zinc-900 group-hover:text-orange-600 transition line-clamp-2">
                    {service.name}
                  </h3>

                  {service.description && (
                    <p className="text-xs text-zinc-600 line-clamp-2 leading-relaxed font-normal">
                      {service.description}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-zinc-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block">Price</span>
                    <span className="text-lg font-black text-orange-600 tracking-tight">
                      {service.pricePi} <span className="text-xs font-bold text-orange-500">π</span>
                    </span>
                  </div>

                  <button
                    type="button"
                    className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-black text-xs transition cursor-pointer shadow-xs"
                  >
                    Book Service
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. RISING PROVIDERS SECTION */}
      {risingProviders.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-base font-black text-zinc-900 tracking-tight">
                Rising Professionals
              </h2>
              <p className="text-xs text-zinc-500 font-medium">
                Emerging talent and specialists in the community
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {risingProviders.map((provider) => (
              <MerchantCard
                key={provider.id}
                merchant={provider}
                services={publishedServices}
                onOpenAbout={onOpenAbout}
              />
            ))}
          </div>
        </div>
      )}

      {/* 6. MARKETPLACE TRUST GUARANTEES */}
      <div className="p-6 sm:p-8 rounded-3xl bg-orange-50/40 space-y-6">
        <div className="text-center space-y-1.5 max-w-md mx-auto">
          <h2 className="text-lg font-black text-zinc-900 tracking-tight">
            Why Book on W3C Marketplace?
          </h2>
          <p className="text-xs text-zinc-600 leading-relaxed font-medium">
            Designed specifically for seamless digital service delivery and secure Pi payments.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white space-y-1 shadow-xs">
            <h3 className="text-xs font-black text-zinc-900">Pi Escrow Protection</h3>
            <p className="text-xs text-zinc-500 leading-relaxed font-normal">
              Funds are held safely in escrow until deliverables meet project criteria.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white space-y-1 shadow-xs">
            <h3 className="text-xs font-black text-zinc-900">Verified Profiles</h3>
            <p className="text-xs text-zinc-500 leading-relaxed font-normal">
              Review genuine provider bios, portfolios, ratings, and skill tags before booking.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white space-y-1 shadow-xs">
            <h3 className="text-xs font-black text-zinc-900">Direct Pi Payments</h3>
            <p className="text-xs text-zinc-500 leading-relaxed font-normal">
              Pay natively using Pi Cryptocurrency inside the Pi Browser app.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white space-y-1 shadow-xs">
            <h3 className="text-xs font-black text-zinc-900">Clear Service Scope</h3>
            <p className="text-xs text-zinc-500 leading-relaxed font-normal">
              Transparent turnarounds, clear inclusions, and fixed Pi pricing upfront.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
