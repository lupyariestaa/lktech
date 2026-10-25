/**
 * Approved banner product configuration copied from the current active
 * catalog entry. Keep pricing/specification changes aligned with that product.
 */
export function buildBannerProduct(updatedAtISO) {
  return {
    slug: "cetak-banner-gratis-desain",
    name: "Cetak Banner Gratis Desain",
    tagline: "Cetak banner dengan bantuan desain gratis.",
    description: `Cetak banner untuk kebutuhan promosi, acara, toko, dan informasi usaha. Pilih bahan dan masukkan ukuran banner untuk melihat estimasi harga sebelum checkout.

Pilihan bahan dan tarif per meter persegi:
- Flexi 280: Rp25.000
- Flexi 340: Rp30.000
- Korea 440: Rp40.000

Harga dihitung dari lebar dalam meter dikali tinggi dalam meter dikali tarif bahan per meter persegi. Contoh: 3 m x 0,5 m x Rp25.000 = Rp37.500. Tidak ada harga minimum. Total dibulatkan ke atas ke kelipatan Rp100.

Desain gratis: setelah checkout, kirim brief, teks, logo, atau referensi desain ke WhatsApp dengan menyebutkan nomor pesanan. Tim akan menyiapkan desain dan mengirimkan proof untuk disetujui sebelum produksi. Website tidak menerima atau menyimpan file desain.

Finishing dapat dipilih tanpa biaya tambahan: tanpa finishing khusus, mata ayam, atau lebih bahan dengan selongsong/rongga.

Pembayaran dilakukan online melalui Mayar setelah checkout. Pesanan diambil langsung di lokasi pickup. Tidak ada ongkos kirim.`,
    category: "percetakan",
    price: 0,
    cover: "https://res.cloudinary.com/y6rvwl7x/image/upload/v1792898965/lktech/portofolio/lr3tn5tnohhg5dagj0ry.webp",
    gallery: [],
    features: [],
    specs: [],
    tools: [],
    includes: [],
    process: [],
    notes: [
      "Kirim brief desain, teks, logo, atau referensi melalui WhatsApp setelah checkout.",
      "Produksi dimulai setelah proof desain disetujui.",
      "Pembayaran dilakukan melalui Mayar. Pesanan diambil langsung di lokasi pickup; tidak ada pengiriman.",
    ],
    variants: [
      {
        slug: "flexi-280",
        name: "Flexi 280",
        price: 0,
        highlight: false,
        soldOut: false,
        features: [],
        specs: [],
        includes: [],
        limits: [],
        printPricing: { method: "area", ratePerM2: 25000 },
      },
      {
        slug: "flexi-340",
        name: "Flexi 340",
        price: 0,
        highlight: false,
        soldOut: false,
        features: [],
        specs: [],
        includes: [],
        limits: [],
        printPricing: { method: "area", ratePerM2: 30000 },
      },
      {
        slug: "korea-440",
        name: "Korea 440",
        price: 0,
        highlight: false,
        soldOut: false,
        features: [],
        specs: [],
        includes: [],
        limits: [],
        printPricing: { method: "area", ratePerM2: 40000 },
      },
    ],
    printConfig: {
      minWidthM: 0.5,
      minHeightM: 0.5,
      maxWidthM: 100,
      maxHeightM: 100,
      minPricePerUnit: 0,
      finishingOptions: [
        { id: "mata-ayam", name: "Mata ayam" },
        { id: "lebih-bahan-selongsong", name: "Lebih bahan & selongsong / rongga" },
      ],
    },
    soldOut: false,
    featured: false,
    active: true,
    updatedAtISO,
    updatedBy: "seed-script",
  };
}
