/* Leitura real da organização demonstrativa. Não altera dados de negócio. */
const { chromium } = require('C:/Users/ilan.wendling/claude/yes7parking/yes7parking-web/node_modules/playwright-core');
const assert = require('node:assert/strict');
const { mkdir } = require('node:fs/promises');
const { resolve } = require('node:path');
const baseURL = 'http://127.0.0.1:5174';
const screenshots = resolve(__dirname, '../../../qa-demo-screenshots');
const pages = [
  ['patio', /Operação do pátio/], ['eventos', /Eventos e ofertas/],
  ['instalacoes', /Instalações/], ['ordens-servico', /Ordens de Serviço/i],
  ['notas-entrada', /Notas de Entrada/i], ['notas-saida', /Notas de Saída/i],
  ['notas-servico', /Notas de Serviço/i], ['estoque', /Estoque/i],
  ['contas-pagar', /Contas a pagar/i], ['contas-receber', /Contas a receber/i],
  ['clientes', /Clientes/], ['fornecedores', /Fornecedores/], ['produtos', /Produtos/],
];
async function run() {
  await mkdir(screenshots, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const failures = [];
    page.on('response', (response) => {
      if (response.url().includes('/api/') && response.status() >= 400) {
        failures.push(response.status() + ' ' + new URL(response.url()).pathname);
      }
    });
    await page.goto(baseURL + '/login');
    await page.getByLabel('Login', { exact: true }).fill('demo.admin');
    // Senha pública sintética, documentada no seed. Nunca usar fora desta base.
    await page.getByLabel('Senha', { exact: true }).fill('Demo!Parking-2026-Explore');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await page.getByRole('heading', { name: 'Escolha a organização' }).waitFor();
    await page.locator('.MuiCard-root').filter({ hasText: 'Yes7 Parking — Organização Demonstrativa' })
      .getByRole('button', { name: 'Entrar', exact: true }).click();
    await page.getByText(/Olá,/).first().waitFor();
    for (const [path, heading] of pages) {
      await page.goto(baseURL + '/app/' + path);
      await page.getByRole('heading', { name: heading }).first().waitFor();
      await page.waitForLoadState('networkidle');
      assert.equal(await page.getByText('Unexpected Application Error!', { exact: true }).count(), 0);
      assert.equal(await page.locator('[role="alert"]').filter({ hasText: /erro inesperado|não foi possível|permissão efetiva/i }).count(), 0, path);
      if (['eventos', 'ordens-servico', 'notas-entrada', 'notas-saida', 'notas-servico',
        'contas-pagar', 'contas-receber', 'clientes', 'fornecedores', 'produtos'].includes(path)) {
        assert.ok(await page.getByRole('row').count() > 1, path + ' deve exibir registros relacionados.');
      }
      if (['patio', 'eventos', 'contas-pagar'].includes(path)) {
        await page.screenshot({ path: resolve(screenshots, path + '-desktop.png'), fullPage: true });
      }
      console.log('PASS: demonstração desktop /app/' + path);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    for (const path of ['patio', 'eventos', 'instalacoes', 'contas-pagar']) {
      await page.goto(baseURL + '/app/' + path);
      await page.waitForLoadState('networkidle');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), path + ' sem overflow horizontal');
      await page.screenshot({ path: resolve(screenshots, path + '-mobile.png'), fullPage: true });
      console.log('PASS: demonstração mobile /app/' + path);
    }
    assert.deepEqual(failures, [], 'Consultas das telas não podem retornar erros HTTP.');
    console.log('QA de leitura concluído; evidências em ' + screenshots);
  } finally { await browser.close(); }
}
run().catch((error) => { console.error(error.message); process.exitCode = 1; });
