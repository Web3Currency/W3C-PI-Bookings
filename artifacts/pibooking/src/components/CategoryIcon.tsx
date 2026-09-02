import React from 'react';
import { BarChart3, Blocks, Bot, BriefcaseBusiness, ChartNoAxesCombined, CheckSquare, Clapperboard, Cloud, Code2, FileText, Megaphone, Palette, PenTool, Scale, ShieldCheck, Users } from 'lucide-react';

const ICONS = { code: Code2, blocks: Blocks, bot: Bot, 'pen-tool': PenTool, palette: Palette, clapperboard: Clapperboard, 'file-text': FileText, megaphone: Megaphone, users: Users, 'briefcase-business': BriefcaseBusiness, 'chart-no-axes-combined': ChartNoAxesCombined, cloud: Cloud, 'shield-check': ShieldCheck, scale: Scale, 'clipboard-check': CheckSquare } as const;

export const CategoryIcon: React.FC<{ icon?: string; className?: string }> = ({ icon, className = 'w-5 h-5' }) => {
  const Icon = icon && icon in ICONS ? ICONS[icon as keyof typeof ICONS] : BarChart3;
  return <Icon className={className} aria-hidden="true" />;
};
