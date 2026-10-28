// Ajoute des photos du colis depuis la page de réservation (section « Photos du colis »).
const path = require('path');
const FILE = path.join(__dirname, 'fixtures', 'fixtures-recto.png');

module.exports = async function addPhotos(page, bookingUrl, kinds) {
  await page.goto(bookingUrl);
  for (const kind of kinds) {
    await page.waitForSelector(`input[data-photo-kind="${kind}"]:not([disabled])`, { state: 'attached' });
    await page.setInputFiles(`input[data-photo-kind="${kind}"]`, FILE);
    await page.waitForSelector(`[data-photo-step="${kind}"] img`, { timeout: 15000 }).catch(async (e) => {
      console.log('alerte photo :', await page.locator(`[data-photo-step="${kind}"] [role=alert]`).allTextContents());
      throw e;
    });
  }
};
