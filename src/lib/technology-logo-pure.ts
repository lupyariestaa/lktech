/**
 * Guard logo paths before passing admin-managed values to `next/image`.
 * Only local, flat files in `/tech/` are currently supported.
 */
export function resolveTechnologyLogo(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const path = value.trim();
  return /^\/tech\/[a-zA-Z0-9][a-zA-Z0-9._-]*\.(?:svg|png|webp|avif)$/i.test(path)
    ? path
    : null;
}

/** Select readable text for the solid brand-color initials fallback. */
export function technologyInitialsColor(color: string): "#0A0F1E" | "#FFFFFF" {
  const hex = color.trim().replace(/^#/, "");
  const normalized = hex.length === 3 ? [...hex].map((x) => x + x).join("") : hex;
  if (!/^[\da-f]{6}$/i.test(normalized)) return "#0A0F1E";

  const channels = [0, 2, 4].map((offset) =>
    Number.parseInt(normalized.slice(offset, offset + 2), 16) / 255,
  );
  const luminance = channels.reduce((sum, channel, index) => {
    const linear = channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    return sum + linear * [0.2126, 0.7152, 0.0722][index];
  }, 0);

  return luminance > 0.179 ? "#0A0F1E" : "#FFFFFF";
}

export function resolveTechnologyColor(value: unknown): string {
  return typeof value === "string" && /^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(value.trim())
    ? value.trim()
    : "#64748B";
}
