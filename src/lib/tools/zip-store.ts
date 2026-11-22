/**
 * Penulis ZIP lokal tanpa dependensi eksternal.
 *
 * Format yang dipakai adalah ZIP32 dengan metode `store` (tanpa kompresi).
 * Gambar WebP/PNG/JPG sudah terkompresi, jadi menambahkan deflate hanya
 * memperlambat proses dan menambah risiko. Semua entri ditulis sebagai berkas
 * datar (tanpa folder), nama UTF-8, dan ukuran/CRC32 diverifikasi sebelum
 * arsip dapat dibuat.
 */

export type ZipEntry = {
  /** Nama berkas datar; pemanggil wajib menyanitasi nama dasar. */
  name: string;
  data: Uint8Array;
};

const LOCAL_SIGNATURE = 0x04034b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const EOCD_SIGNATURE = 0x06054b50;
const UTF8_FLAG = 0x0800;
const STORE_METHOD = 0;
const ZIP32_MAX = 0xffffffff;
const MAX_ENTRIES = 0xffff;

let crcTable: Uint32Array | null = null;

function getCrcTable(): Uint32Array {
  if (crcTable) return crcTable;
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  crcTable = table;
  return table;
}

/** CRC32 sesuai spesifikasi ZIP/PNG. Hasil selalu bilangan unsigned 32-bit. */
export function crc32(data: Uint8Array): number {
  const table = getCrcTable();
  let crc = 0xffffffff;
  for (let index = 0; index < data.byteLength; index += 1) {
    crc = (crc >>> 8) ^ table[(crc ^ data[index]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Bangun arsip ZIP dari entri gambar yang sudah divalidasi.
 *
 * Melempar `Error` bila tidak ada entri, nama tidak aman/duplikat, atau ukuran
 * melampaui batas ZIP32. Pemanggil harus menampilkan pesan error tersebut.
 */
export function buildZipStore(
  entries: readonly ZipEntry[],
  now: Date = new Date(),
): Uint8Array {
  if (entries.length === 0) {
    throw new Error("Tidak ada hasil yang dapat dimasukkan ke ZIP.");
  }
  if (entries.length > MAX_ENTRIES) {
    throw new Error("Jumlah berkas melebihi batas ZIP.");
  }

  const encoder = new TextEncoder();
  const seen = new Set<string>();
  const prepared = entries.map((entry) => {
    const name = normalizeEntryName(entry.name);
    const lowered = name.toLowerCase();
    if (seen.has(lowered)) {
      throw new Error(`Nama berkas duplikat di ZIP: ${name}.`);
    }
    seen.add(lowered);
    const nameBytes = encoder.encode(name);
    if (nameBytes.byteLength === 0 || nameBytes.byteLength > 0xffff) {
      throw new Error("Nama berkas ZIP tidak valid.");
    }
    if (entry.data.byteLength > ZIP32_MAX) {
      throw new Error("Satu berkas hasil terlalu besar untuk ZIP.");
    }
    return {
      nameBytes,
      data: entry.data,
      crc: crc32(entry.data),
    };
  });

  const { time, date } = toDosDateTime(now);
  let localBytes = 0;
  let centralBytes = 0;
  for (const entry of prepared) {
    localBytes += 30 + entry.nameBytes.byteLength + entry.data.byteLength;
    centralBytes += 46 + entry.nameBytes.byteLength;
  }
  const totalBytes = localBytes + centralBytes + 22;
  if (totalBytes > ZIP32_MAX) {
    throw new Error("Total hasil terlalu besar untuk satu ZIP.");
  }

  const output = new Uint8Array(totalBytes);
  const view = new DataView(output.buffer);
  const localOffsets: number[] = [];
  let offset = 0;

  for (const entry of prepared) {
    localOffsets.push(offset);
    view.setUint32(offset, LOCAL_SIGNATURE, true);
    offset += 4;
    view.setUint16(offset, 20, true);
    offset += 2;
    view.setUint16(offset, UTF8_FLAG, true);
    offset += 2;
    view.setUint16(offset, STORE_METHOD, true);
    offset += 2;
    view.setUint16(offset, time, true);
    offset += 2;
    view.setUint16(offset, date, true);
    offset += 2;
    view.setUint32(offset, entry.crc, true);
    offset += 4;
    view.setUint32(offset, entry.data.byteLength, true);
    offset += 4;
    view.setUint32(offset, entry.data.byteLength, true);
    offset += 4;
    view.setUint16(offset, entry.nameBytes.byteLength, true);
    offset += 2;
    view.setUint16(offset, 0, true);
    offset += 2;
    output.set(entry.nameBytes, offset);
    offset += entry.nameBytes.byteLength;
    output.set(entry.data, offset);
    offset += entry.data.byteLength;
  }

  const centralOffset = offset;
  prepared.forEach((entry, index) => {
    view.setUint32(offset, CENTRAL_SIGNATURE, true);
    offset += 4;
    view.setUint16(offset, 20, true);
    offset += 2;
    view.setUint16(offset, 20, true);
    offset += 2;
    view.setUint16(offset, UTF8_FLAG, true);
    offset += 2;
    view.setUint16(offset, STORE_METHOD, true);
    offset += 2;
    view.setUint16(offset, time, true);
    offset += 2;
    view.setUint16(offset, date, true);
    offset += 2;
    view.setUint32(offset, entry.crc, true);
    offset += 4;
    view.setUint32(offset, entry.data.byteLength, true);
    offset += 4;
    view.setUint32(offset, entry.data.byteLength, true);
    offset += 4;
    view.setUint16(offset, entry.nameBytes.byteLength, true);
    offset += 2;
    view.setUint16(offset, 0, true);
    offset += 2;
    view.setUint16(offset, 0, true);
    offset += 2;
    view.setUint16(offset, 0, true);
    offset += 2;
    view.setUint16(offset, 0, true);
    offset += 2;
    view.setUint32(offset, 0, true);
    offset += 4;
    view.setUint32(offset, localOffsets[index] ?? 0, true);
    offset += 4;
    output.set(entry.nameBytes, offset);
    offset += entry.nameBytes.byteLength;
  });

  const centralSize = offset - centralOffset;
  view.setUint32(offset, EOCD_SIGNATURE, true);
  offset += 4;
  view.setUint16(offset, 0, true);
  offset += 2;
  view.setUint16(offset, 0, true);
  offset += 2;
  view.setUint16(offset, prepared.length, true);
  offset += 2;
  view.setUint16(offset, prepared.length, true);
  offset += 2;
  view.setUint32(offset, centralSize, true);
  offset += 4;
  view.setUint32(offset, centralOffset, true);
  offset += 4;
  view.setUint16(offset, 0, true);
  offset += 2;

  if (offset !== totalBytes) {
    throw new Error("Gagal menyusun ZIP secara konsisten.");
  }
  return output;
}

function normalizeEntryName(input: string): string {
  const name = (input ?? "").trim().replace(/\\/g, "/");
  if (
    !name ||
    name === "." ||
    name === ".." ||
    name.startsWith("/") ||
    name.includes("/") ||
    /[\u0000-\u001f\u007f]/.test(name)
  ) {
    throw new Error("Nama berkas ZIP tidak aman.");
  }
  return name;
}

function toDosDateTime(now: Date): { time: number; date: number } {
  const year = clamp(Math.trunc(now.getFullYear()), 1980, 2107);
  const month = clamp(Math.trunc(now.getMonth()) + 1, 1, 12);
  const day = clamp(Math.trunc(now.getDate()), 1, 31);
  const hours = clamp(Math.trunc(now.getHours()), 0, 23);
  const minutes = clamp(Math.trunc(now.getMinutes()), 0, 59);
  const seconds = clamp(Math.trunc(now.getSeconds()), 0, 59);
  return {
    time: (hours << 11) | (minutes << 5) | (seconds >> 1),
    date: ((year - 1980) << 9) | (month << 5) | day,
  };
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}
