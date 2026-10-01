import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Membuat slug URL-friendly dari teks (huruf kecil, hanya a-z0-9 dan `-`).
 * Dipakai bersama oleh form dashboard (layanan/proyek) agar konsisten.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Membersihkan & membatasi slug untuk dipakai sebagai document ID / URL.
 * Selalu lewat `slugify`, lalu dibatasi panjangnya. Mengembalikan "" bila
 * tidak menghasilkan slug yang berguna.
 */
export function sanitizeSlug(input: string, maxLength = 120): string {
  return slugify(input).slice(0, maxLength).replace(/-+$/g, "");
}

