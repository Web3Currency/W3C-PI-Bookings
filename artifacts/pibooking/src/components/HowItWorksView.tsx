import React from 'react';
import { ArrowLeft, CheckCircle2, ShieldCheck, Users, WalletCards, MessageCircle, ClipboardCheck, Search, Briefcase, Clock3 } from 'lucide-react';

interface HowItWorksViewProps { onBack: () => void; }

const steps = [
  ['1', 'Provider offers a service', 'A service provider creates a profile and publishes the service they want to offer, including the price, description, delivery details and relevant information.'],
  ['2', 'Client finds a service', 'Clients can browse or search available services and providers, then open a service or provider profile to understand what is being offered.'],
  ['3', 'Client chooses the service', 'The client selects the service that matches what they need and provides the booking details required to start the job.'],
  ['4', 'Client pays in Pi', 'The client reviews the booking and completes payment in Pi through the application. The payment is connected to that specific booking.'],
  ['5', 'Provider accepts or rejects', 'The provider receives the booking request and can accept it or reject it with a reason. An acceptance deadline is attached to the booking.'],
  ['6', 'Client and provider communicate', 'The booking has connected chat so both sides can discuss the work, clarify requirements and keep the conversation tied to the job.'],
  ['7', 'Provider delivers the work', 'The provider completes and delivers the agreed service. The client can request a revision when the delivered work needs changes.'],
  ['8', 'Client confirms completion', 'When the client is satisfied that the service has been completed, they confirm completion from the booking.'],
  ['9', 'Settlement is completed', 'After completion is confirmed, the booking moves through the settlement process so the provider can receive the payout.'],
];

const capabilities = [
  [Search, 'Find services and providers', 'Browse, search and filter the marketplace.'],
  [Users, 'Provider profiles', 'Review provider information, skills, specialties and services.'],
  [Briefcase, 'Provider onboarding', 'Create a provider profile and enter the provider network.'],
  [ClipboardCheck, 'Booking management', 'Create, track and manage service bookings from request through completion.'],
  [WalletCards, 'Pi payment', 'Pay for a booking in Pi with the payment connected to the booking record.'],
  [ShieldCheck, 'Protected booking state', 'Keep payment and provider payout as separate stages of the booking.'],
  [MessageCircle, 'Booking-linked chat', 'Communicate with the other party in the context of the booking.'],
  [CheckCircle2, 'Completion and reviews', 'Confirm completed work and submit a review after a booking.'],
  [Clock3, 'Provider earnings', 'Track booking earnings and payout states through the provider side of the app.'],
];

export const HowItWorksView: React.FC<HowItWorksViewProps> = ({ onBack }) => (
  <div className="max-w-4xl mx-auto pb-12">
    <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-xs font-bold text-zinc-600 hover:text-orange-700 mb-5 cursor-pointer">
      <ArrowLeft className="w-4 h-4" /> Back
    </button>

    <div className="rounded-3xl bg-zinc-950 text-white p-6 sm:p-10 mb-6">
      <p className="text-[10px] uppercase tracking-[0.2em] font-black text-orange-400 mb-3">W3C Pi Bookings</p>
      <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-4">How W3C Pi Bookings Works</h1>
      <p className="text-sm sm:text-base text-zinc-300 leading-7 max-w-3xl">W3C Pi Bookings is a marketplace for everyday services in the Pi Network ecosystem. It connects people who need a service with people who have the skills to provide it, while keeping the booking, Pi payment, communication, delivery, completion and settlement connected in one place.</p>
      <div className="mt-6 flex flex-wrap gap-2 text-[11px] font-bold">
        {['Discover', 'Choose', 'Book', 'Pay in Pi', 'Accept', 'Communicate', 'Deliver', 'Confirm', 'Settle'].map((item) => <span key={item} className="px-3 py-1.5 rounded-full bg-white/10 border border-white/10">{item}</span>)}
      </div>
    </div>

    <section className="rounded-3xl border border-zinc-200 bg-white p-5 sm:p-8 mb-6">
      <h2 className="text-xl font-black tracking-tight mb-2">The basic idea</h2>
      <p className="text-sm text-zinc-600 leading-7">The application brings the main parts of a service transaction together. A client finds a provider, books a service and pays in Pi. The provider receives the request, accepts it, communicates with the client and delivers the work. The client confirms completion, and the provider moves through the payout process.</p>
    </section>

    <section className="mb-8">
      <div className="mb-4"><p className="text-[10px] uppercase tracking-widest font-black text-orange-600">The booking journey</p><h2 className="text-2xl font-black tracking-tight">From service discovery to settlement</h2></div>
      <div className="space-y-3">
        {steps.map(([number, title, text]) => <div key={number} className="flex gap-4 rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5"><div className="w-8 h-8 shrink-0 rounded-full bg-orange-600 text-white flex items-center justify-center text-xs font-black">{number}</div><div><h3 className="font-extrabold text-sm mb-1">{title}</h3><p className="text-sm text-zinc-600 leading-6">{text}</p></div></div>)}
      </div>
    </section>

    <section className="rounded-3xl bg-orange-50 border border-orange-100 p-5 sm:p-8 mb-8">
      <h2 className="text-xl font-black tracking-tight mb-2">What “escrow” means here</h2>
      <p className="text-sm text-zinc-700 leading-7 mb-4">Escrow separates the moment a client pays from the moment a provider receives the payout. The booking keeps track of the payment and the work as the service moves forward.</p>
      <div className="flex flex-wrap items-center gap-2 text-xs font-black text-zinc-800"><span className="px-3 py-2 rounded-xl bg-white border border-orange-100">Client pays</span><span>→</span><span className="px-3 py-2 rounded-xl bg-white border border-orange-100">Booking active</span><span>→</span><span className="px-3 py-2 rounded-xl bg-white border border-orange-100">Service delivered</span><span>→</span><span className="px-3 py-2 rounded-xl bg-white border border-orange-100">Client confirms</span><span>→</span><span className="px-3 py-2 rounded-xl bg-white border border-orange-100">Provider payout</span></div>
      <p className="text-xs text-zinc-600 leading-6 mt-4">If a provider rejects a booking, the rejection reason is recorded and the booking follows the cancellation/refund process rather than proceeding as a normal completed job.</p>
    </section>

    <section className="mb-8">
      <div className="mb-4"><p className="text-[10px] uppercase tracking-widest font-black text-orange-600">What is available</p><h2 className="text-2xl font-black tracking-tight">Current application capabilities</h2></div>
      <div className="grid sm:grid-cols-2 gap-3">{capabilities.map(([Icon, title, text]) => <div key={title as string} className="rounded-2xl border border-zinc-200 bg-white p-4"><Icon className="w-5 h-5 text-orange-600 mb-3" /><h3 className="font-extrabold text-sm mb-1">{title as string}</h3><p className="text-xs text-zinc-600 leading-5">{text as string}</p></div>)}</div>
    </section>

    <section className="grid sm:grid-cols-2 gap-4 mb-8">
      <div className="rounded-3xl border border-zinc-200 p-5"><h2 className="font-black mb-2">For clients</h2><p className="text-sm text-zinc-600 leading-6">Find services, review providers, book in Pi, communicate through the booking, receive the work, request revisions when needed and confirm completion.</p></div>
      <div className="rounded-3xl border border-zinc-200 p-5"><h2 className="font-black mb-2">For service providers</h2><p className="text-sm text-zinc-600 leading-6">Create a provider profile, publish services, receive booking requests, accept or reject jobs, communicate with clients, deliver work and track earnings and payout states.</p></div>
    </section>

    <section className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5 sm:p-8 mb-8">
      <h2 className="text-xl font-black tracking-tight mb-3">What happens when something goes wrong?</h2>
      <p className="text-sm text-zinc-600 leading-7">The application records important booking actions and keeps payment, communication, delivery and completion connected to the booking. Provider rejection, cancellation, refund-related actions and other exceptional states can be handled through the booking and administrative processes. This does not guarantee that every user will behave correctly, so clients and providers should still review profiles, service details and booking terms carefully.</p>
    </section>

    <section className="rounded-3xl border border-zinc-200 bg-white p-5 sm:p-8">
      <p className="text-[10px] uppercase tracking-widest font-black text-orange-600 mb-2">Current status</p>
      <h2 className="text-xl font-black tracking-tight mb-3">Built and being validated on Pi Testnet</h2>
      <p className="text-sm text-zinc-600 leading-7">The core marketplace and booking journey is substantially implemented and is being hardened through testing. Work still includes improving unusual failure and recovery cases, release timing, duplicate actions, missed deadlines and dispute/recovery handling. This page describes the application as it currently works; it is not a promise of future features.</p>
      <div className="mt-5 rounded-2xl bg-zinc-950 text-white p-4 text-sm font-black text-center">Find a service → Book → Pay in Pi → Work gets done → Confirm → Settle</div>
    </section>

    <p className="text-center text-[11px] text-zinc-400 mt-8">Built by W3C Digital Network · Current environment: Pi Testnet</p>
  </div>
);
