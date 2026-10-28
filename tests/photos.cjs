// Ajoute des photos du colis depuis la page de réservation (section « Photos du colis »).
// Chaque appel fabrique une image différente : le serveur refuse une même photo réutilisée.
const crypto = require('crypto');
const sharp = require('sharp');

const image = async () => {
  const raw = crypto.randomBytes(48 * 36 * 3);
  return sharp(raw, { raw: { width: 48, height: 36, channels: 3 } }).resize(480, 360, { kernel: 'nearest' }).jpeg().toBuffer();
};

async function upload(page, kind, buffer) {
  await page.waitForSelector(`input[data-photo-kind="${kind}"]:not([disabled])`, { state: 'attached' });
  await page.setInputFiles(`input[data-photo-kind="${kind}"]`, { name: `${kind}.jpg`, mimeType: 'image/jpeg', buffer });
}

module.exports = async function addPhotos(page, bookingUrl, kinds) {
  await page.goto(bookingUrl);
  for (const kind of kinds) {
    await upload(page, kind, await image());
    await page.waitForSelector(`[data-photo-step="${kind}"] img`, { timeout: 15000 }).catch(async (e) => {
      console.log('alerte photo :', await page.locator(`[data-photo-step="${kind}"] [role=alert]`).allTextContents());
      throw e;
    });
  }
};
module.exports.image = image;
module.exports.upload = upload;
