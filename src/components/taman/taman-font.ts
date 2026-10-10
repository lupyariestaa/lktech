import { Press_Start_2P } from "next/font/google";

/**
 * Font pixel untuk seksi Taman (V2-4). Dimuat dengan `preload: false` supaya
 * berkasnya TIDAK diunduh di halaman lain — browser baru mengunduhnya saat
 * glyph dipakai di seksi Taman. Dipakai lewat kelas `pixel.variable`.
 */
export const pixel = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-taman-pixel",
  display: "swap",
  preload: false,
});
