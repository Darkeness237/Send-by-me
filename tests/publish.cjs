// Formulaire de publication en 3 écrans : les tests remplissent tout d'un coup puis passent les écrans.
const reveal = (page) => page.evaluate(() => document.querySelectorAll('form [hidden]').forEach((el) => el.removeAttribute('hidden')));
exports.openAll = reveal;
exports.next = async (page) => {
  for (let i = 0; i < 2; i++) {
    const btn = page.locator('button:has-text("Suivant")');
    if (!(await btn.count())) break;
    const before = await page.locator('[aria-current=step]').textContent();
    await btn.click();
    await page.waitForTimeout(900); // fin du défilement vers le haut
    if ((await page.locator('[aria-current=step]').textContent()) === before) {
      const invalid = await page.evaluate(() => [...document.querySelectorAll('form input, form select, form textarea')].filter((e) => !e.checkValidity()).map((e) => `${e.name || e.id}: ${e.validationMessage}`));
      throw new Error(`Étape bloquée (${before}) : ${invalid.join(' | ')}`);
    }
  }
  await reveal(page);
};
