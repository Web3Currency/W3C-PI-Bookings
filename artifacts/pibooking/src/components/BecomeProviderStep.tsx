import React, { useState } from 'react';
import { PiUser } from '../types';
import {
  ArrowLeft,
  User,
  Briefcase,
  FileText,
  Image as ImageIcon,
  ArrowRight,
  ShieldCheck,
  Wallet,
  MapPin,
  Tag,
  Globe,
  Clock,
  Award,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

export interface BecomeProviderDetails {
  fullName: string;
  piUsername: string;
  roleTitle: string;
  headline?: string;
  bio: string;
  photoUrl: string;
  piWalletAddress: string;
  location?: string;
  specialties?: string[];
  skills?: string[];
  experienceLevel?: string;
  yearsExperience?: number;
  availabilityStatus?: string;
  responseTime?: string;
  languages?: string[];
  serviceMode?: string;
  website?: string;
  portfolioImages?: string[];
}

interface BecomeProviderStepProps {
  piUser: PiUser | null;
  onBack: () => void;
  onSubmit: (details: BecomeProviderDetails) => void;
  submitting?: boolean;
}

export const BecomeProviderStep: React.FC<BecomeProviderStepProps> = ({
  piUser,
  onBack,
  onSubmit,
  submitting = false,
}) => {
  const [fullName, setFullName] = useState(piUser?.username || '');
  const [piUsername, setPiUsername] = useState(piUser?.username ? `@${piUser.username}` : '');
  const [roleTitle, setRoleTitle] = useState('');
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [piWalletAddress, setPiWalletAddress] = useState('');
  const [location, setLocation] = useState('');

  const [experienceLevel, setExperienceLevel] = useState('Intermediate');
  const [yearsExperience, setYearsExperience] = useState<string>('3');
  const [serviceMode, setServiceMode] = useState('Remote');
  const [specialtiesInput, setSpecialtiesInput] = useState('');
  const [skillsInput, setSkillsInput] = useState('');
  const [languagesInput, setLanguagesInput] = useState('English');

  const [availabilityStatus, setAvailabilityStatus] = useState('available');
  const [responseTime, setResponseTime] = useState('Within 1 hour');

  const [website, setWebsite] = useState('');
  const [portfolioImagesText, setPortfolioImagesText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const specialties = specialtiesInput
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const skills = skillsInput
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const languages = languagesInput
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const portfolioImages = portfolioImagesText
      .split('\n')
      .flatMap((line) => line.split(','))
      .map((url) => url.trim())
      .filter((url) => url.length > 0 && url.startsWith('http'));

    onSubmit({
      fullName,
      piUsername,
      roleTitle,
      headline: headline || undefined,
      bio,
      photoUrl,
      piWalletAddress,
      location: location || undefined,
      specialties,
      skills,
      experienceLevel,
      yearsExperience: yearsExperience ? Number(yearsExperience) : undefined,
      availabilityStatus,
      responseTime,
      languages,
      serviceMode,
      website: website || undefined,
      portfolioImages,
    });
  };

  return (
    <div className="space-y-4 pb-28 animate-in fade-in slide-in-from-right-4 duration-200">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-zinc-100 text-zinc-800 text-xs font-semibold hover:bg-zinc-200 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
      </div>

      {/* Intro Header */}
      <div className="p-5 rounded-2xl bg-white space-y-1 shadow-md">
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-extrabold uppercase tracking-wider shadow-2xs">
            <Sparkles className="w-3 h-3 text-amber-600" />
            <span>Become a Provider</span>
          </span>
        </div>
        <h2 className="text-base font-black text-zinc-900 tracking-tight">
          Complete Your Service Merchant Profile
        </h2>
        <p className="text-xs text-zinc-500 leading-relaxed">
          Provide your details to stand out to Pioneers and receive booking requests on the Pi Network.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Section 1: Provider Identity */}
        <div className="p-5 rounded-2xl bg-white space-y-3.5 shadow-md">
          <h3 className="text-xs font-black text-zinc-900 uppercase tracking-wider flex items-center gap-2">
            <User className="w-4 h-4 text-amber-600" />
            <span>1. Identity & Contact Information</span>
          </h3>

          <div className="space-y-3">
            {/* Display Name */}
            <div>
              <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                Display Name <span className="text-amber-600">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Adeyemo Jibola"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-amber-500 focus:bg-white transition"
                />
              </div>
            </div>

            {/* Pi Username */}
            <div>
              <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                Pi Username <span className="text-amber-600">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={piUsername}
                  onChange={(e) => setPiUsername(e.target.value)}
                  placeholder="@your_pi_username"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-amber-500 focus:bg-white transition"
                />
              </div>
            </div>

            {/* Role Title & Headline */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                  Primary Role / Title <span className="text-amber-600">*</span>
                </label>
                <div className="relative">
                  <Briefcase className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={roleTitle}
                    onChange={(e) => setRoleTitle(e.target.value)}
                    placeholder="e.g. Graphic Designer, Web Developer"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-amber-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                  Professional Tagline / Headline
                </label>
                <div className="relative">
                  <Award className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="e.g. Senior Fullstack Engineer & Designer"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-amber-500 focus:bg-white transition"
                  />
                </div>
              </div>
            </div>

            {/* Photo URL & Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                  Profile Photo URL
                </label>
                <div className="relative">
                  <ImageIcon className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                  <input
                    type="url"
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-amber-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                  Location / Base City
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Lagos, Nigeria or Remote"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-amber-500 focus:bg-white transition"
                  />
                </div>
              </div>
            </div>

            {/* Pi Wallet Address */}
            <div>
              <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                Pi Wallet Address (for Escrow Payouts)
              </label>
              <div className="relative">
                <Wallet className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={piWalletAddress}
                  onChange={(e) => setPiWalletAddress(e.target.value)}
                  placeholder="Enter your Pi wallet public key"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-amber-500 focus:bg-white transition font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Experience & Specialties */}
        <div className="p-5 rounded-2xl bg-white space-y-3.5 shadow-md">
          <h3 className="text-xs font-black text-zinc-900 uppercase tracking-wider flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-600" />
            <span>2. Skills & Experience</span>
          </h3>

          <div className="space-y-3">
            {/* Experience Level & Years */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                  Experience Level
                </label>
                <select
                  value={experienceLevel}
                  onChange={(e) => setExperienceLevel(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:border-amber-500 focus:bg-white transition"
                >
                  <option value="Entry Level">Entry Level</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Senior">Senior / Expert</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                  Years of Experience
                </label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={yearsExperience}
                  onChange={(e) => setYearsExperience(e.target.value)}
                  placeholder="e.g. 5"
                  className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-amber-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                  Service Delivery Mode
                </label>
                <select
                  value={serviceMode}
                  onChange={(e) => setServiceMode(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:border-amber-500 focus:bg-white transition"
                >
                  <option value="Remote">Remote / Online</option>
                  <option value="Onsite">On-site / In-person</option>
                  <option value="Hybrid">Hybrid</option>
                </select>
              </div>
            </div>

            {/* Specialties & Skills inputs */}
            <div>
              <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                Specialties (comma-separated)
              </label>
              <div className="relative">
                <Tag className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={specialtiesInput}
                  onChange={(e) => setSpecialtiesInput(e.target.value)}
                  placeholder="e.g. UI/UX Design, Brand Identity, Mobile Apps"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-amber-500 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                Skills & Technologies (comma-separated)
              </label>
              <div className="relative">
                <Tag className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={skillsInput}
                  onChange={(e) => setSkillsInput(e.target.value)}
                  placeholder="e.g. Figma, React, Tailwind, Photoshop, Node.js"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-amber-500 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                Languages Spoken (comma-separated)
              </label>
              <input
                type="text"
                value={languagesInput}
                onChange={(e) => setLanguagesInput(e.target.value)}
                placeholder="e.g. English, French, Spanish"
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-amber-500 focus:bg-white transition"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Bio & Availability */}
        <div className="p-5 rounded-2xl bg-white space-y-3.5 shadow-md">
          <h3 className="text-xs font-black text-zinc-900 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-600" />
            <span>3. Bio & Availability</span>
          </h3>

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                Bio / Profile Introduction <span className="text-amber-600">*</span>
              </label>
              <textarea
                rows={4}
                required
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Describe your background, expertise, service approach, and what clients can expect..."
                className="w-full p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-amber-500 focus:bg-white transition leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                  Availability Status
                </label>
                <select
                  value={availabilityStatus}
                  onChange={(e) => setAvailabilityStatus(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:border-amber-500 focus:bg-white transition"
                >
                  <option value="available">🟢 Available Now</option>
                  <option value="busy">🟡 Busy / Limited Slots</option>
                  <option value="away">🔴 Away / Not Accepting Orders</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                  Typical Response Time
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={responseTime}
                    onChange={(e) => setResponseTime(e.target.value)}
                    placeholder="e.g. Within 1 hour, Within 24 hours"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-amber-500 focus:bg-white transition"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: External Links & Portfolio */}
        <div className="p-5 rounded-2xl bg-white space-y-3.5 shadow-md">
          <h3 className="text-xs font-black text-zinc-900 uppercase tracking-wider flex items-center gap-2">
            <Globe className="w-4 h-4 text-amber-600" />
            <span>4. Portfolio & External Links</span>
          </h3>

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                Website / Portfolio Link
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://yourportfolio.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-amber-500 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                Portfolio Showcase Images (URLs, 1 per line)
              </label>
              <textarea
                rows={3}
                value={portfolioImagesText}
                onChange={(e) => setPortfolioImagesText(e.target.value)}
                placeholder="https://image1.jpg&#10;https://image2.jpg"
                className="w-full p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-amber-500 focus:bg-white transition font-mono"
              />
            </div>
          </div>
        </div>

        {/* Escrow Guarantee Note */}
        <div className="p-4 rounded-2xl bg-emerald-50 shadow-xs flex items-center gap-2.5 text-xs text-emerald-900 font-medium">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Client payments are held securely in Pi Smart Escrow and automatically released to your wallet upon confirmed completion.</span>
        </div>

        {/* Bottom Fixed Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-zinc-200 z-50">
          <div className="max-w-md mx-auto flex items-center justify-between gap-3">
            <div className="text-xs">
              <span className="block text-zinc-500 font-medium">W3C Pi Network</span>
              <span className="font-bold text-zinc-900">Verified Provider</span>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-sm active:scale-[0.98] transition flex items-center justify-center gap-2 min-h-[48px] shadow-md shadow-amber-500/20 cursor-pointer"
            >
              <span>{submitting ? 'Saving Profile...' : 'Complete & Save Profile'}</span>
              {!submitting && <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
