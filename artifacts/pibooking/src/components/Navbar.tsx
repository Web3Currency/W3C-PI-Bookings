import React, { useState, useEffect } from 'react';
import { BusinessProfile, PiUser } from '../types';
import {
  Menu,
  X,
  Home,
  Search,
  CalendarCheck,
  Briefcase,
  LogIn,
  Loader2,
} from 'lucide-react';

interface NavbarProps {
  currentBusiness: BusinessProfile;
  piUser: PiUser | null;
  piAuthLoading?: boolean;
  onSignIn?: () => void;
  onSignOut?: () => void;
  hasProvider?: boolean;
  onOpenBecomeProvider?: () => void;
  onOpenProviderConsole?: () => void;
  // Navigation props
  activeTab: 'browse' | 'search' | 'bookings';
  currentFlow: string;
  bookingsCount: number;
  onNavigateHome: () => void;
  onNavigateSearch: () => void;
  onNavigateBookings: () => void;
  onOpenAboutBusiness?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentBusiness,
  piUser,
  piAuthLoading = false,
  onSignIn,
  onSignOut,
  hasProvider = false,
  onOpenBecomeProvider,
  onOpenProviderConsole,
  activeTab,
  currentFlow,
  bookingsCount,
  onNavigateHome,
  onNavigateSearch,
  onNavigateBookings,
  onOpenAboutBusiness,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Close drawer on Escape key or lock body scroll
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  const handleNavAction = (action?: () => void) => {
    setIsMenuOpen(false);
    if (action) {
      action();
    }
  };

  const [logoImgError, setLogoImgError] = useState(false);
  const appLogoUrl = currentBusiness.logoUrl || currentBusiness.avatarUrl;

  return (
    <>
      <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/95 border-b border-zinc-100 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
          {/* Left section: Hamburger button & Brand title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMenuOpen(true)}
              id="btn-open-side-menu"
              aria-label="Open Navigation Menu"
              className="p-2 -ml-2 rounded-xl text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 active:scale-95 transition flex items-center justify-center cursor-pointer"
            >
              <Menu className="w-5 h-5 stroke-[2.2]" />
            </button>

            <button
              onClick={onNavigateHome}
              className="flex items-center gap-2 text-left cursor-pointer"
            >
              {!logoImgError && appLogoUrl ? (
                <img
                  src={appLogoUrl}
                  alt={currentBusiness.name}
                  onError={() => setLogoImgError(true)}
                  className="w-8 h-8 rounded-full object-cover shadow-xs border border-zinc-100"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-orange-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                  W3C
                </div>
              )}
              <div className="hidden sm:block">
                <span className="font-black text-sm text-zinc-900 tracking-tight block">
                  {currentBusiness.name}
                </span>
                <span className="text-[10px] text-zinc-500 font-semibold block">
                  Digital Service Network
                </span>
              </div>
            </button>
          </div>

          {/* Right section: Pi auth state / Actions */}
          <div className="flex items-center gap-2">
            {piAuthLoading ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 text-orange-950 text-xs font-semibold">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-600" />
                <span>Connecting…</span>
              </div>
            ) : piUser ? (
              <div className="flex items-center gap-2">
                {piUser && !hasProvider && onOpenBecomeProvider && (
                  <button
                    onClick={onOpenBecomeProvider}
                    id="btn-nav-become-provider"
                    title="Become a Provider"
                    className="px-3.5 py-1.5 rounded-full bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    Become a Provider
                  </button>
                )}
                <div className="flex items-center gap-1.5 pl-1">
                  <div
                    title={piUser.username}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-600 to-amber-600 text-white font-black text-xs flex items-center justify-center shadow-2xs"
                  >
                    {piUser.username ? piUser.username.charAt(0).toUpperCase() : 'P'}
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={onSignIn}
                id="btn-nav-signin"
                className="px-4 py-1.5 rounded-full bg-orange-600 hover:bg-orange-500 text-white text-xs font-black transition shadow-2xs cursor-pointer"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Side Navigation Drawer Overlay */}
      <div
        className={`fixed inset-0 bg-zinc-950/40 backdrop-blur-xs z-50 transition-opacity duration-300 ${
          isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsMenuOpen(false)}
        aria-hidden="true"
      />

      {/* Side Navigation Drawer Panel */}
      <aside
        id="side-navigation-drawer"
        className={`fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] bg-white z-50 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out border-r border-zinc-100 ${
          isMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Side Navigation Menu"
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-zinc-100 flex items-center justify-between gap-2 bg-zinc-50/70">
          <button
            onClick={() => handleNavAction(onNavigateHome)}
            className="flex items-center gap-2.5 text-left group cursor-pointer"
          >
            {!logoImgError && appLogoUrl ? (
              <img
                src={appLogoUrl}
                alt={currentBusiness.name}
                onError={() => setLogoImgError(true)}
                className="w-8 h-8 rounded-full object-cover shrink-0 shadow-xs border border-zinc-100"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-orange-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                W3C
              </div>
            )}
            <div>
              <span className="font-black text-sm text-zinc-900 tracking-tight block">
                {currentBusiness.name}
              </span>
              <span className="text-[10px] text-zinc-500 font-semibold block">
                Pi Network Marketplace
              </span>
            </div>
          </button>
          <button
            onClick={() => setIsMenuOpen(false)}
            id="btn-close-side-menu"
            aria-label="Close Menu"
            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Account Card */}
        <div className="p-4 border-b border-zinc-100 bg-orange-50/30">
          {piAuthLoading ? (
            <div className="flex items-center gap-2 text-orange-900 text-xs font-semibold">
              <Loader2 className="w-4 h-4 animate-spin text-orange-600" />
              <span>Connecting to Pi Network…</span>
            </div>
          ) : piUser ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-600 text-white font-black flex items-center justify-center text-sm shadow-2xs">
                {piUser.username ? piUser.username.charAt(0).toUpperCase() : 'P'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-sm text-zinc-900 truncate">
                    {piUser.username?.startsWith('@') ? piUser.username : `@${piUser.username}`}
                  </span>
                </div>
                <span className="inline-block px-2 py-0.5 rounded-full bg-orange-100 text-orange-950 text-[10px] font-bold mt-0.5">
                  {hasProvider ? 'Verified Provider' : 'Pi Pioneer Member'}
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-zinc-600 font-medium leading-relaxed">
                Connect your Pi Network account to book services, track orders, or become a service provider.
              </p>
              <button
                onClick={() => handleNavAction(onSignIn)}
                className="w-full py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs transition shadow-2xs cursor-pointer"
              >
                Sign in with Pi
              </button>
            </div>
          )}
        </div>

        {/* Drawer Navigation Links */}
        <div className="flex-1 overflow-y-auto p-3 space-y-5">
          {/* Section 1: DISCOVER */}
          <div className="space-y-1">
            <div className="px-3 text-[10px] font-black uppercase tracking-wider text-zinc-400">
              Discover
            </div>
            <button
              onClick={() => handleNavAction(onNavigateHome)}
              id="drawer-nav-home"
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition cursor-pointer ${
                activeTab === 'browse' && currentFlow === 'browse'
                  ? 'bg-orange-50 text-orange-700 font-bold border-l-4 border-orange-600 shadow-2xs'
                  : 'text-zinc-700 hover:bg-zinc-100 font-semibold'
              }`}
            >
              <Home className="w-4 h-4 text-zinc-500" />
              <span>Home</span>
            </button>
            <button
              onClick={() => handleNavAction(onNavigateSearch)}
              id="drawer-nav-search"
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition cursor-pointer ${
                activeTab === 'search'
                  ? 'bg-orange-50 text-orange-700 font-bold border-l-4 border-orange-600 shadow-2xs'
                  : 'text-zinc-700 hover:bg-zinc-100 font-semibold'
              }`}
            >
              <Search className="w-4 h-4 text-zinc-500" />
              <span>Search Services</span>
            </button>
          </div>

          {/* Section 2: MY ACTIVITY */}
          <div className="space-y-1">
            <div className="px-3 text-[10px] font-black uppercase tracking-wider text-zinc-400">
              My Activity
            </div>
            <button
              onClick={() => handleNavAction(onNavigateBookings)}
              id="drawer-nav-bookings"
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition cursor-pointer ${
                activeTab === 'bookings'
                  ? 'bg-orange-50 text-orange-700 font-bold border-l-4 border-orange-600 shadow-2xs'
                  : 'text-zinc-700 hover:bg-zinc-100 font-semibold'
              }`}
            >
              <div className="flex items-center gap-3">
                <CalendarCheck className="w-4 h-4 text-zinc-500" />
                <span>My Bookings</span>
              </div>
              {bookingsCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-orange-600 text-white font-extrabold text-[10px]">
                  {bookingsCount}
                </span>
              )}
            </button>
          </div>

          {/* Section 3: PROVIDER OPPORTUNITY */}
          <div className="space-y-1 pt-2 border-t border-zinc-100">
            <div className="px-3 text-[10px] font-black uppercase tracking-wider text-zinc-400">
              Provider Network
            </div>
            {hasProvider ? (
              <button
                onClick={() => handleNavAction(onOpenProviderConsole)}
                id="drawer-nav-provider-console"
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-orange-800 bg-orange-50 hover:bg-orange-100 transition cursor-pointer"
              >
                <Briefcase className="w-4 h-4 text-orange-600" />
                <span>Provider Console</span>
              </button>
            ) : (
              <button
                onClick={() => handleNavAction(onOpenBecomeProvider)}
                id="drawer-nav-become-provider"
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 transition cursor-pointer"
              >
                <Briefcase className="w-4 h-4 text-orange-600" />
                <span>Become a Service Provider</span>
              </button>
            )}
          </div>
        </div>

        {/* Drawer Footer / Sign Out */}
        {piUser && onSignOut && (
          <div className="p-3 border-t border-zinc-100 bg-zinc-50">
            <button
              onClick={() => handleNavAction(onSignOut)}
              id="drawer-nav-signout"
              className="w-full py-2 text-center text-xs font-bold text-zinc-500 hover:text-red-600 transition cursor-pointer"
            >
              Sign Out of Pi Network
            </button>
          </div>
        )}
      </aside>
    </>
  );
};
