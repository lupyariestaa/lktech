import {
  Globe,
  Smartphone,
  Compass,
  Palette,
  Megaphone,
  Wallet,
  Handshake,
  Code2,
  Zap,
  ShieldCheck,
  Sparkles,
  Camera,
  Briefcase,
  Code,
  Heart,
  Bell,
  TrendingUp,
  BarChart3,
  Layers,
  Target,
  FolderOpen,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  globe: Globe,
  smartphone: Smartphone,
  compass: Compass,
  palette: Palette,
  megaphone: Megaphone,
  wallet: Wallet,
  handshake: Handshake,
  code: Code2,
  zap: Zap,
  shield: ShieldCheck,
  sparkles: Sparkles,
  instagram: Camera,
  linkedin: Briefcase,
  github: Code,
  heart: Heart,
  bell: Bell,
  trending: TrendingUp,
  chartBar: BarChart3,
  layers: Layers,
  target: Target,
  folder: FolderOpen,
};

export function Icon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Cmp = ICONS[name] ?? Sparkles;
  return <Cmp className={className} />;
}
