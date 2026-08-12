import React, { useState } from 'react';
import { BusinessProfile, Provider, Service, SocialLink } from '../types';
import { X } from 'lucide-react';

interface PublicProfileViewProps {
  merchant: BusinessProfile | Provider;
  services: Service[];
  onBack: () => void;
  onSelectService: (service: Service) => void;
}

export const PublicProfileView: React.FC<PublicProfileViewProps> = ({
  merchant,
  services,
  onBack,
  onSelectService,
}) => {
  const [selectedGalleryImage, setSelectedGalleryImage] = useState<string | null>(null);

  const isBusiness = 'avatarUrl' in merchant;
  const isProvider = 'fullName' in merchant;

  // Normalize Profile Info
  const name = isBusiness
    ? (merchant as BusinessProfile).name
    : (merchant as Provider).fullName;

  const photoUrl = isBusiness
    ? (merchant as BusinessProfile).avatarUrl
    : (merchant as Provider).photoUrl;

  const fallbackAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
    name
  )}&backgroundColor=ea580c,f97316&textColor=ffffff`;

  const avatar = photoUrl && photoUrl.trim().length > 0 ? photoUrl.trim() : fallbackAvatar;

  const headline = isBusiness
    ? 'Official Marketplace Owner & Platform Network'
    : (merchant as Provider).headline || (merchant as Provider).roleTitle;

  const bio = merchant.bio;

  const location = isProvider
    ? (merchant as Provider).location || (merchant as Provider).serviceMode || 'Remote'
    : (merchant as BusinessProfile).location || 'Global / Remote';

  const availabilityStatus = isProvider
    ? (merchant as Provider).availabilityStatus || 'available'
    : (merchant as BusinessProfile).availabilityStatus || 'available';

  const responseTime = isProvider
    ? (merchant as Provider).responseTime
    : (merchant as BusinessProfile).responseTime;

  // Rating
  const rating = merchant.rating;
  const reviewsCount = merchant.reviewsCount;
  const hasRealRating = rating !== undefined && rating !== null && Number(rating) > 0 && reviewsCount !== undefined && Number(reviewsCount) > 0;

  // Specialties & Skills
  const specialties = isBusiness
    ? (merchant as BusinessProfile).specialties || []
    : (merchant as Provider).specialties || [];
  const skills = isProvider ? (merchant as Provider).skills || [] : [];
  const allTags = Array.from(new Set([...specialties, ...skills]));

  // Languages & Experience (Provider specific)
  const languages = isProvider ? (merchant as Provider).languages || [] : [];
  const experienceLevel = isProvider ? (merchant as Provider).experienceLevel : undefined;
  const yearsExperience = isProvider ? (merchant as Provider).yearsExperience : undefined;
  const serviceMode = isProvider ? (merchant as Provider).serviceMode : undefined;

  // Social Links
  const rawSocials: SocialLink[] = isBusiness
    ? (merchant as BusinessProfile).socials || (merchant as BusinessProfile).socialLinks || []
    : (merchant as Provider).socialLinks || [];

  const website = merchant.website;
  const email = (merchant as BusinessProfile).email;
  const phone = (merchant as BusinessProfile).phone;

  // Published Services for this Provider
  const publishedServices = services.filter((s) => {
    if (s.status !== 'Published') return false;
    if (isProvider) {
      return s.providerId === merchant.id;
    }
    return false;
  });

  // Portfolio Images (For Providers)
  const portfolioList: string[] = isProvider
    ? (merchant as Provider).portfolioImages || []
    : [];

  return (
    <div className="space-y-6 pb-24 animate-in fade-in slide-in-from-right-4 duration-200">
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          id="btn-back-from-public-profile"
          className="px-4 py-2 rounded-full bg-zinc-100 text-zinc-800 text-xs font-bold hover:bg-zinc-200 transition cursor-pointer"
        >
          ← Back to Marketplace
        </button>
      </div>

      {/* Hero Header Card - Clean marketplace presentation, no heavy outlines */}
      <div className="relative rounded-3xl bg-profile-hero-gradient p-6 sm:p-8 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="relative shrink-0">
            <div className="w-24 h-24 rounded-full bg-orange-100 p-0.5 overflow-hidden shadow-xs">
              <img
                src={avatar}
                alt={name}
                className="w-full h-full rounded-full object-cover"
              />
            </div>
            {availabilityStatus === 'available' && (
              <span
                className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-emerald-500 ring-2 ring-white flex items-center justify-center text-white text-[10px] font-bold"
                title="Active Platform"
              >
                ✓
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight">
                {isBusiness ? `About ${name}` : name}
              </h1>
              {isBusiness && (
                <span className="inline-block px-3 py-0.5 rounded-full bg-orange-100 text-orange-950 font-extrabold text-[10px] uppercase tracking-wider">
                  Marketplace Owner
                </span>
              )}
            </div>

            {headline && (
              <p className="text-xs sm:text-sm text-orange-600 font-bold">
                {headline}
              </p>
            )}

            <div className="flex items-center gap-4 text-xs pt-1 flex-wrap text-zinc-600 font-medium">
              {hasRealRating && (
                <div className="flex items-center gap-1 bg-amber-50 px-2.5 py-0.5 rounded-full">
                  <span className="font-extrabold text-zinc-900">{Number(rating).toFixed(1)} ★</span>
                  <span className="text-zinc-500 font-medium text-[11px]">({reviewsCount} reviews)</span>
                </div>
              )}

              <div>
                <span>Location: {location}</span>
              </div>

              {responseTime && (
                <div>
                  <span>Response time: {responseTime}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* About Overview Section Card */}
      <div className="p-6 rounded-3xl bg-white shadow-sm space-y-3">
        <h2 className="text-xs font-black uppercase tracking-wider text-zinc-500">
          About {isBusiness ? name : 'Provider'}
        </h2>

        {bio ? (
          <p className="text-xs sm:text-sm text-zinc-700 leading-relaxed font-normal whitespace-pre-line">
            {bio}
          </p>
        ) : (
          <p className="text-xs text-zinc-400 italic">
            No description provided.
          </p>
        )}

        {/* Provider Highlights */}
        {isProvider && (experienceLevel || yearsExperience || serviceMode || languages.length > 0) && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-zinc-100 text-xs">
            {experienceLevel && (
              <div className="p-3 rounded-2xl bg-zinc-50 space-y-0.5">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Level</span>
                <span className="font-extrabold text-zinc-900 block text-xs">{experienceLevel}</span>
              </div>
            )}

            {yearsExperience !== undefined && yearsExperience > 0 && (
              <div className="p-3 rounded-2xl bg-zinc-50 space-y-0.5">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Experience</span>
                <span className="font-extrabold text-zinc-900 block text-xs">{yearsExperience} Years</span>
              </div>
            )}

            {serviceMode && (
              <div className="p-3 rounded-2xl bg-zinc-50 space-y-0.5">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Mode</span>
                <span className="font-extrabold text-zinc-900 block text-xs">{serviceMode}</span>
              </div>
            )}

            {languages.length > 0 && (
              <div className="p-3 rounded-2xl bg-zinc-50 space-y-0.5">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Languages</span>
                <span className="font-extrabold text-zinc-900 block text-xs">{languages.join(', ')}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Official Contacts & Links Card */}
      {(email || phone || website || rawSocials.length > 0) && (
        <div className="p-6 rounded-3xl bg-white shadow-sm space-y-4">
          <h2 className="text-xs font-black uppercase tracking-wider text-zinc-500">
            Contacts & Platform Links
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {email && (
              <a
                href={`mailto:${email}`}
                className="p-3.5 rounded-2xl bg-zinc-50 hover:bg-orange-50/50 transition flex flex-col space-y-0.5 text-zinc-800"
              >
                <span className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-wider block">Email</span>
                <span className="font-bold text-zinc-900 text-xs truncate block">{email}</span>
              </a>
            )}

            {phone && (
              <a
                href={`tel:${phone}`}
                className="p-3.5 rounded-2xl bg-zinc-50 hover:bg-orange-50/50 transition flex flex-col space-y-0.5 text-zinc-800"
              >
                <span className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-wider block">Phone</span>
                <span className="font-bold text-zinc-900 text-xs truncate block">{phone}</span>
              </a>
            )}

            {website && (
              <a
                href={website.startsWith('http') ? website : `https://${website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3.5 rounded-2xl bg-zinc-50 hover:bg-orange-50/50 transition flex flex-col space-y-0.5 text-zinc-800"
              >
                <span className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-wider block">Website</span>
                <span className="font-bold text-zinc-900 text-xs truncate block">{website}</span>
              </a>
            )}
          </div>

          {/* Social Links */}
          {rawSocials.length > 0 && (
            <div className="pt-2 flex items-center gap-2 flex-wrap">
              {rawSocials.map((s, idx) => (
                <a
                  key={idx}
                  href={s.url.startsWith('http') ? s.url : `https://${s.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition shadow-2xs"
                  title={s.platform || s.handle}
                >
                  {s.platform || s.handle || 'Link'}
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Skills & Specialties */}
      {allTags.length > 0 && (
        <div className="p-6 rounded-3xl bg-white shadow-sm space-y-3">
          <h2 className="text-xs font-black uppercase tracking-wider text-zinc-500">
            Specialties & Skills
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            {allTags.map((tag, idx) => (
              <span
                key={idx}
                className="px-3.5 py-1 rounded-full bg-zinc-100 text-zinc-800 text-xs font-bold"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Published Services Section */}
      {isProvider && (
        <div id="public-services-section" className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base font-black text-zinc-900 tracking-tight">
              Services & Listings ({publishedServices.length})
            </h2>
          </div>

          {publishedServices.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {publishedServices.map((srv) => (
                <div
                  key={srv.id}
                  className="p-5 rounded-2xl bg-white shadow-sm hover:shadow-md transition space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <span className="inline-block px-3 py-0.5 rounded-full bg-orange-100/80 text-orange-950 text-[10px] font-extrabold uppercase tracking-wider">
                      {srv.category}
                    </span>
                    <h3 className="text-base font-extrabold text-zinc-900">{srv.name}</h3>
                    <p className="text-xs text-zinc-600 line-clamp-2 font-normal leading-relaxed">{srv.description}</p>
                  </div>

                  <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-zinc-400 uppercase font-extrabold block">Price</span>
                      <span className="font-black text-orange-600 text-base">{srv.pricePi} π</span>
                    </div>

                    <button
                      onClick={() => onSelectService(srv)}
                      id={`btn-book-service-${srv.id}`}
                      className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-black text-xs transition cursor-pointer shadow-xs"
                    >
                      Book Service
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-white rounded-3xl shadow-sm">
              <p className="text-xs text-zinc-500 font-semibold">
                No active services currently listed by this provider.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Portfolio Showcase Section */}
      {isProvider && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base font-black text-zinc-900 tracking-tight">
              Portfolio & Work Showcase ({portfolioList.length})
            </h2>
          </div>

          {portfolioList.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {portfolioList.map((imgUrl, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedGalleryImage(imgUrl)}
                  className="group relative rounded-2xl overflow-hidden bg-zinc-100 aspect-4/3 cursor-pointer hover:shadow-md transition shadow-xs"
                >
                  <img
                    src={imgUrl}
                    alt={`Portfolio sample ${idx + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-white rounded-3xl shadow-sm">
              <p className="text-xs text-zinc-500 font-semibold">
                No portfolio items uploaded yet.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Lightbox Modal for Portfolio */}
      {selectedGalleryImage && (
        <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="relative max-w-lg w-full rounded-3xl bg-zinc-900 overflow-hidden shadow-2xl space-y-0">
            <button
              onClick={() => setSelectedGalleryImage(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-zinc-950/80 text-white hover:bg-zinc-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={selectedGalleryImage}
              alt="Portfolio Preview"
              className="w-full h-auto max-h-[70vh] object-contain bg-zinc-950"
            />
            <div className="p-4 bg-zinc-900 text-center space-y-2">
              <button
                onClick={() => setSelectedGalleryImage(null)}
                className="w-full py-2.5 rounded-xl bg-orange-600 text-white font-bold text-xs cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
