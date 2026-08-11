import React from 'react';
import { Globe, Accessibility, Twitter, Facebook, Instagram, Linkedin, Send, Youtube, Github } from 'lucide-react';
import { BusinessProfile } from '../types';

interface FooterProps {
  currentBusiness?: BusinessProfile;
}

export const Footer: React.FC<FooterProps> = ({ currentBusiness }) => {
  const socials = (currentBusiness?.socials || currentBusiness?.socialLinks || []).filter(
    (s) => s && s.url && s.url.trim().length > 0
  );

  const getSocialIcon = (platformName: string) => {
    const p = platformName.toLowerCase();
    if (p.includes('twitter') || p.includes('x.com') || p === 'x') {
      return <Twitter className="w-4 h-4" />;
    }
    if (p.includes('instagram')) {
      return <Instagram className="w-4 h-4" />;
    }
    if (p.includes('linkedin')) {
      return <Linkedin className="w-4 h-4" />;
    }
    if (p.includes('facebook')) {
      return <Facebook className="w-4 h-4" />;
    }
    if (p.includes('telegram')) {
      return <Send className="w-4 h-4" />;
    }
    if (p.includes('youtube')) {
      return <Youtube className="w-4 h-4" />;
    }
    if (p.includes('github')) {
      return <Github className="w-4 h-4" />;
    }
    if (p.includes('tiktok')) {
      return (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 1 1-2.88-2.88c.37 0 .72.07 1.04.2v-3.5a6.37 6.37 0 1 0 5.29 6.25V9.41a8.16 8.16 0 0 0 4.77 1.52V7.48a4.85 4.85 0 0 1-1-.79z" />
        </svg>
      );
    }
    if (p.includes('pinterest')) {
      return (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M12 0a12 12 0 0 0-4.37 23.17c-.08-.94-.15-2.39.03-3.42l1.24-5.26s-.31-.63-.31-1.56c0-1.46.85-2.55 1.9-2.55.9 0 1.33.67 1.33 1.48 0 .9-.58 2.26-.88 3.51-.25 1.05.53 1.91 1.56 1.91 1.88 0 3.33-1.98 3.33-4.84 0-2.53-1.82-4.3-4.41-4.3-3.01 0-4.78 2.26-4.78 4.59 0 .91.35 1.89.79 2.42.09.11.1.2.07.31l-.29 1.18c-.05.18-.15.22-.35.13-1.32-.61-2.14-2.53-2.14-4.08 0-3.32 2.42-6.37 6.96-6.37 3.65 0 6.49 2.6 6.49 6.08 0 3.63-2.29 6.55-5.47 6.55-1.07 0-2.07-.56-2.42-1.22l-.66 2.5c-.24.92-.88 2.07-1.31 2.76A12 12 0 1 0 12 0z" />
        </svg>
      );
    }
    return <Globe className="w-4 h-4" />;
  };

  return (
    <footer className="w-full bg-zinc-950 text-zinc-300 py-10 px-4 mt-auto border-t border-zinc-800/80">
      <div className="max-w-6xl mx-auto flex flex-col items-center text-center space-y-6">
        {/* Brand Header */}
        <div className="flex items-center justify-center">
          <span className="text-4xl sm:text-5xl font-black text-white tracking-tight">
            W3C
          </span>
        </div>

        {/* Copyright */}
        <p className="text-xs text-zinc-400 font-medium">
          © W3C Digital Network Ltd. {new Date().getFullYear()}
        </p>

        {/* Social Icons (Only render social media in business profile) */}
        {socials.length > 0 && (
          <div className="flex items-center justify-center flex-wrap gap-5 text-zinc-400">
            {socials.map((item, idx) => (
              <a
                key={idx}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                aria-label={item.platform || item.handle}
                title={item.platform || item.handle}
                className="hover:text-white transition-colors p-1"
              >
                {getSocialIcon(item.platform || item.url)}
              </a>
            ))}
          </div>
        )}

        {/* Separator dot */}
        <div className="w-1 h-1 rounded-full bg-zinc-800" />

        {/* Locale & Settings Toolbar */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-400 font-medium">
          <button className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer">
            <Globe className="w-3.5 h-3.5 text-zinc-400" />
            <span>English</span>
          </button>
          <button className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer">
            <span className="font-bold text-amber-500">π</span>
            <span>PI</span>
          </button>
          <button className="p-1 rounded-full hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer" title="Accessibility">
            <Accessibility className="w-4 h-4 text-zinc-400" />
          </button>
        </div>
      </div>
    </footer>
  );
};
