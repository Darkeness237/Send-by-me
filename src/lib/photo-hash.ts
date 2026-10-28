// Empreintes d'image : SHA-256 pour la copie exacte, « dHash » 64 bits pour la même photo
// recompressée, redimensionnée ou légèrement retouchée.
import "server-only";
import { createHash } from "node:crypto";
import sharp from "sharp";

export async function fingerprint(buf: Buffer) {
  const sha = createHash("sha256").update(buf).digest("hex");
  let phash: string | null = null;
  try {
    const px = await sharp(buf).rotate().grayscale().resize(9, 8, { fit: "fill" }).raw().toBuffer();
    let hex = "";
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x += 4) {
        let nibble = 0;
        for (let k = 0; k < 4; k++) nibble = (nibble << 1) | (px[y * 9 + x + k] > px[y * 9 + x + k + 1] ? 1 : 0);
        hex += nibble.toString(16);
      }
    phash = hex;
  } catch {
    // Format non lisible ici (HEIC) : seule la copie exacte est détectée.
  }
  return { sha, phash };
}

/** Nombre de bits différents entre deux dHash (0 = même image, au-delà de ~10 = photos différentes). */
export function hashDistance(a: string, b: string) {
  let n = 0;
  for (let i = 0; i < 16; i++) for (let x = parseInt(a[i], 16) ^ parseInt(b[i], 16); x; x >>= 1) n += x & 1;
  return n;
}

/** En dessous de ce seuil, deux photos sont considérées comme la même prise de vue. */
export const SAME_PHOTO_DISTANCE = 6;
