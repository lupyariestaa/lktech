/** Minimal 24-bit BMP encoder for already-decoded RGBA pixels. */
export function encodeBmp24(
  rgba: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
): Uint8Array {
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width < 1 ||
    height < 1 ||
    rgba.length !== width * height * 4
  ) {
    throw new Error("Data piksel BMP tidak valid.");
  }

  const rowSize = Math.ceil((width * 3) / 4) * 4;
  const pixelBytes = rowSize * height;
  const fileSize = 54 + pixelBytes;
  if (!Number.isSafeInteger(fileSize) || fileSize > 0xffffffff) {
    throw new Error("Ukuran hasil BMP terlalu besar untuk format 24-bit.");
  }

  const output = new Uint8Array(fileSize);
  const view = new DataView(output.buffer);
  output[0] = 0x42;
  output[1] = 0x4d;
  view.setUint32(2, fileSize, true);
  view.setUint32(10, 54, true);
  view.setUint32(14, 40, true);
  view.setInt32(18, width, true);
  view.setInt32(22, height, true);
  view.setUint16(26, 1, true);
  view.setUint16(28, 24, true);
  view.setUint32(34, pixelBytes, true);
  view.setInt32(38, 2835, true);
  view.setInt32(42, 2835, true);

  for (let y = 0; y < height; y += 1) {
    const sourceRow = (height - 1 - y) * width * 4;
    const targetRow = 54 + y * rowSize;
    for (let x = 0; x < width; x += 1) {
      const source = sourceRow + x * 4;
      const target = targetRow + x * 3;
      const alpha = rgba[source + 3] / 255;
      output[target] = Math.round(rgba[source + 2] * alpha + 255 * (1 - alpha));
      output[target + 1] = Math.round(rgba[source + 1] * alpha + 255 * (1 - alpha));
      output[target + 2] = Math.round(rgba[source] * alpha + 255 * (1 - alpha));
    }
  }

  return output;
}
