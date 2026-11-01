import {
  Braces,
  FileText,
  ImageDown,
  Images,
  Palette,
  Wrench,
  type LucideIcon,
} from "lucide-react";

/**
 * Memetakan `ToolDefinition.icon` (string dari registry murni) ke ikon lucide.
 * Registry sengaja menyimpan nama ikon sebagai string agar tetap murni/testable.
 */
const ICONS: Record<string, LucideIcon> = {
  Palette,
  ImageDown,
  FileText,
  Images,
  Braces,
};

export function ToolIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = ICONS[name] ?? Wrench;
  return <Icon className={className} aria-hidden="true" />;
}