-- W3C Pi Bookings — Marketplace Category System, Phase 1
-- Applied to Supabase project flbksqjzkarnqtggoptq.
-- This file documents the normalized category foundation; application integration follows in Phase 2/3.

create table if not exists public.service_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  icon text,
  display_order integer not null default 0,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.provider_categories (
  provider_id uuid not null references public.providers(id) on delete cascade,
  category_id uuid not null references public.service_categories(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (provider_id, category_id)
);

alter table public.services add column if not exists category_id uuid references public.service_categories(id) on delete restrict;

create index if not exists service_categories_active_order_idx on public.service_categories (is_active, display_order);
create index if not exists service_categories_featured_order_idx on public.service_categories (is_featured, display_order);
create index if not exists services_category_id_idx on public.services (category_id);
create index if not exists provider_categories_category_id_idx on public.provider_categories (category_id);

insert into public.service_categories (name, slug, description, display_order, is_featured) values
('Web & Software Development','web-software-development','Websites, web applications, software, APIs, databases, ecommerce, mobile and other software development services.',1,true),
('Blockchain & Web3 Development','blockchain-web3-development','Blockchain, dApps, DeFi, tokenization, NFTs, GameFi, protocols and other Web3 development services.',2,true),
('AI & Automation','ai-automation','AI development, AI integration, agents, chatbots, workflow automation and intelligent business systems.',3,true),
('UI/UX & Product Design','ui-ux-product-design','User interface, user experience, product design, wireframes, prototypes and design systems.',4,true),
('Graphic & Visual Design','graphic-visual-design','Branding, logos, illustrations, social graphics, presentations, 3D and other visual design services.',5,true),
('Video, Animation & Multimedia','video-animation-multimedia','Video editing, motion graphics, animation, explainers, reels, advertisements and multimedia production.',6,true),
('Writing & Content','writing-content','Copywriting, technical writing, articles, blogs, documentation, scripts, editing and proofreading.',7,true),
('Marketing & Growth','marketing-growth','SEO, digital marketing, content marketing, email marketing, advertising, lead generation and growth strategy.',8,true),
('Social & Community','social-community','Community management, social media management, moderation, community growth and online community operations.',9,false),
('Business & Strategy','business-strategy','Business development, partnerships, market research, strategy, go-to-market and ecosystem development.',10,false),
('Data & Analytics','data-analytics','Data analysis, dashboards, Web3 analytics, on-chain analysis, visualization and research services.',11,false),
('DevOps, Cloud & Infrastructure','devops-cloud-infrastructure','DevOps, cloud deployment, CI/CD, server management, blockchain infrastructure and monitoring.',12,false),
('Cybersecurity & Auditing','cybersecurity-auditing','Security reviews, smart contract audits, penetration testing, vulnerability assessment and security consulting.',13,false),
('Research, Compliance & Finance','research-compliance-finance','Crypto research, tokenomics, risk management, compliance, regulatory research and financial research.',14,false),
('Project & Professional Services','project-professional-services','Project management, product management, developer relations, grant writing, consulting and professional digital services.',15,false)
on conflict (slug) do nothing;

update public.services s set category_id = c.id from public.service_categories c
where c.slug = case lower(coalesce(s.category,''))
  when 'web_dev' then 'web-software-development'
  when 'web-development' then 'web-software-development'
  when 'web development' then 'web-software-development'
  when 'graphics_design' then 'graphic-visual-design'
  when 'graphic_design' then 'graphic-visual-design'
  when 'graphics' then 'graphic-visual-design'
  when 'graphic' then 'graphic-visual-design'
  else null
end and s.category_id is null;

alter table public.service_categories enable row level security;
alter table public.provider_categories enable row level security;

drop policy if exists "service_categories_public_read" on public.service_categories;
create policy "service_categories_public_read" on public.service_categories for select to anon, authenticated using (is_active = true);

drop policy if exists "provider_categories_public_read" on public.provider_categories;
create policy "provider_categories_public_read" on public.provider_categories for select to anon, authenticated using (true);

revoke insert, update, delete on public.service_categories from anon, authenticated;
revoke insert, update, delete on public.provider_categories from anon, authenticated;
