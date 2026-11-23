/* QA visual somente leitura na prévia local e organização sintética. */
const { chromium } = require('C:/Users/ilan.wendling/claude/yes7parking/yes7parking-web/node_modules/playwright-core');
const assert = require('node:assert/strict');
const { mkdir } = require('node:fs/promises');
const { resolve } = require('node:path');
const baseURL = 'http://127.0.0.1:5174';
const baseline = process.argv.includes('--baseline');
const output = resolve('C:/Users/ilan.wendling/claude/yes7parking/tmp/qa-pendencias-20261120');

async function login(browser, account, mode) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addInitScript((colorMode) => localStorage.setItem('kaneko.mode', colorMode), mode);
  const page = await context.newPage();
  await page.goto(baseURL + '/login');
  await page.getByLabel('Login', { exact: true }).fill(account);
  // Conta pública de teste, conforme README do seed. Nenhum segredo real.
  await page.getByLabel('Senha', { exact: true }).fill('Demo!Parking-2026-Explore');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.getByRole('heading', { name: 'Escolha a organização' }).waitFor();
  await page.locator('.MuiCard-root').filter({ hasText: 'Yes7 Parking — Organização Demonstrativa' })
    .getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.getByRole('heading', { name: /Olá,/ }).waitFor();
  await page.waitForLoadState('networkidle');
  return { context, page };
}
async function run() {
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const mode of baseline ? ['dark'] : ['dark', 'light']) {
      const { page, context } = await login(browser, 'demo.admin', mode);
      const errors = [];
      page.on('response', (response) => {
        if (response.url().includes('/api/') && response.status() >= 400) errors.push(response.status() + ' ' + new URL(response.url()).pathname);
      });
      for (const width of baseline ? [1440, 390] : [1440, 1024, 390, 320]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.goto(baseURL + '/app');
        await page.getByRole('heading', { name: 'Pendências', exact: true }).waitFor();
        await page.waitForLoadState('networkidle');
        if (!baseline) {
          const category = page.getByRole('region', { name: 'Contas a pagar', exact: true });
          await category.waitFor();
          assert.equal(await category.getByRole('listitem').count(), 3);
          const geometry = await page.evaluate(() => {
            const lists = [...document.querySelectorAll('section[aria-labelledby^="pendency-heading-"] ul')];
            const violations = [];
            for (const list of lists) {
              if (list.scrollHeight > list.clientHeight + 1) violations.push('rolagem interna');
              const rows = [...list.children];
              for (let i = 0; i < rows.length; i++) {
                const box = rows[i].getBoundingClientRect();
                if (i && rows[i - 1].getBoundingClientRect().bottom > box.top) violations.push('itens sobrepostos');
                for (const text of rows[i].querySelectorAll('p, time')) {
                  const inner = text.getBoundingClientRect();
                  if (inner.bottom > box.bottom + 1 || inner.top < box.top - 1 || inner.right > box.right + 1) violations.push('texto fora do item');
                }
              }
            }
            return { overflow: document.documentElement.scrollWidth > window.innerWidth + 1, violations };
          });
          assert.deepEqual(geometry, { overflow: false, violations: [] }, mode + ' ' + width);
          const exact = await category.getByRole('listitem').first().getByRole('link').getAttribute('href');
          assert.match(exact, /^\/app\/contas-pagar\?detail=\d+$/);
          await category.getByRole('button', { name: 'Ver mais de Contas a pagar' }).click();
          assert.equal(await category.getByRole('listitem').count(), 5);
          await category.getByRole('button', { name: 'Ver menos de Contas a pagar' }).click();
        }
        await page.evaluate(() => {
          if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
          window.scrollTo(0, 0);
        });
        await page.mouse.move(0, 0);
        await page.screenshot({ path: resolve(output, `${baseline ? 'antes' : 'depois'}-${mode}-${width}.png`), fullPage: true });
        console.log(`PASS: ${baseline ? 'captura anterior' : 'sem sobreposição, expansão e link exato'} ${mode} ${width}px`);
      }
      if (!baseline) {
        const category = page.getByRole('region', { name: 'Contas a pagar', exact: true });
        const destination = await category.getByRole('listitem').first().getByRole('link').getAttribute('href');
        const titleId = new URL(destination, baseURL).searchParams.get('detail');
        await category.getByRole('listitem').first().getByRole('link').click();
        await page.waitForURL(/\/app\/contas-pagar/);
        await page.getByRole('heading', { name: 'Pendências', exact: true }).waitFor({ state: 'hidden' });
        await page.getByRole('heading', { name: new RegExp('^Título ' + titleId + ' —') }).waitFor();
        await page.waitForLoadState('networkidle');
        assert.equal(await page.getByRole('heading', { name: 'Pendências', exact: true }).count(), 0, 'O link deve abrir o registro, não a home.');
        assert.deepEqual(errors, []);
      }
      await context.close();
    }
    if (!baseline) {
      const { context, page } = await login(browser, 'demo.caixa', 'dark');
      assert.equal(await page.locator('section[aria-labelledby^="pendency-heading-"]').count(), 0);
      await page.getByText('Não há consultas de pendências disponíveis para o seu acesso.').waitFor();
      console.log('PASS: Caixa não recebe categorias nem atalhos financeiros/fiscais indevidos.');
      await context.close();
    }
    console.log('Evidências: ' + output);
  } finally { await browser.close(); }
}
run().catch((error) => { console.error(error.message); process.exitCode = 1; });
