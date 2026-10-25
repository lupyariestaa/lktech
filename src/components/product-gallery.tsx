"use client";

import { Package } from "lucide-react";
import { MediaGallery, type GalleryImage } from "@/components/media-gallery";

export type { GalleryImage };

/**
 * Galeri produk — wrapper tipis di atas `MediaGallery` generik.
 *
 * Dipertahankan agar halaman produk tidak perlu berubah; perilaku &
 * tampilan identik dengan sebelumnya.
 */
export function ProductGallery({
  images,
  productName,
  ratio = "video",
}: {
  images: GalleryImage[];
  productName: string;
  ratio?: "square" | "video";
}) {
  return (
    <MediaGallery
      images={images}
      label={productName}
      placeholderIcon={<Package className="h-16 w-16" />}
      ratio={ratio === "square" ? "square" : "video"}
    />
  );
}
