/* Somente prévia local e organização sintética; não confirma saída ou correção. */
const { chromium } = require('C:/Users/ilan.wendling/claude/yes7parking/yes7parking-web/node_modules/playwright-core');
const assert = require('node:assert/strict');
const { mkdir } = require('node:fs/promises');
const { resolve } = require('node:path');
const baseURL = 'http://127.0.0.1:5174';
const output = resolve('C:/Users/ilan.wendling/claude/yes7parking/tmp/qa-patio-filter-20261121');
async function login(browser, account) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  await page.goto(baseURL + '/login');
  await page.getByLabel('Login', { exact: true }).fill(account);
  // Senha pública exclusivamente da organização sintética do seed.
  await page.getByLabel('Senha', { exact: true }).fill('Demo!Parking-2026-Explore');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.getByRole('heading', { name: 'Escolha a organização' }).waitFor();
  await page.locator('.MuiCard-root').filter({ hasText: 'Yes7 Parking — Organização Demonstrativa' })
    .getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.getByRole('heading', { name: /Olá,/ }).waitFor();
  const report = page.waitForResponse((r) => new URL(r.url()).pathname === '/api/relatorios/patio' && r.status() === 200);
  await page.goto(baseURL + '/app/patio');
  const data = await (await report).json();
  const forbiddenWrites = [];
  page.on('request', (r) => {
    const path = new URL(r.url()).pathname;
    if (r.method() === 'POST' && path.startsWith('/api/v1/patio/') && !path.endsWith('/previa-saida')) forbiddenWrites.push(path);
  });
  return { page, context, data, forbiddenWrites };
}
async function noOverflow(page) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'A página não pode rolar horizontalmente.');
  for (const name of ['Cartões', 'Listagem']) {
    const box = await page.getByRole('button', { name, exact: true }).boundingBox();
    assert.ok(box && box.height >= 44 && box.width >= 44, 'Seletor deve ser fácil de tocar.');
  }
}
async function capture(page, name) {
  await page.getByRole('heading', { name: 'Veículos no pátio', exact: true }).scrollIntoViewIfNeeded();
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    const heading = [...document.querySelectorAll('h2')].find((node) => node.textContent === 'Veículos no pátio');
    if (heading) window.scrollTo(0, window.scrollY + heading.getBoundingClientRect().top - 140);
  });
  await page.mouse.move(0, 0);
  await page.screenshot({ path: resolve(output, name + '.png') });
}
async function run() {
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const admin = await login(browser, 'demo.admin');
    const { page, data } = admin;
    assert.ok(data.itens.length > 1);
    const cards = page.getByRole('list', { name: 'Veículos no pátio em cartões' });
    await cards.waitFor();
    assert.equal(await cards.getByRole('listitem').count(), data.itens.length);
    const monthly = data.itens.filter((item) => item.tipo === 'MENSALISTA');
    const single = data.itens.filter((item) => item.tipo === 'AVULSO');
    assert.ok(monthly.length && single.length, 'A organização demonstrativa precisa ter ambos os tipos para este cenário.');
    const allFilter = page.getByRole('button', { name: 'Mostrar todos os veículos: ' + data.resumo.totalVeiculos });
    const monthlyFilter = page.getByRole('button', { name: 'Mostrar mensalistas: ' + data.resumo.mensalistas });
    const singleFilter = page.getByRole('button', { name: 'Mostrar avulsos: ' + data.resumo.avulsos });
    await monthlyFilter.click();
    assert.equal(await monthlyFilter.getAttribute('aria-pressed'), 'true');
    assert.equal(await cards.getByRole('listitem').count(), monthly.length);
    await page.getByLabel('Buscar placa no pátio').fill(single[0].placa);
    await page.getByText('Nenhum veículo neste filtro', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Limpar filtros', exact: true }).click();
    assert.equal(await cards.getByRole('listitem').count(), data.itens.length);
    const plate = data.itens[0].placa;
    await page.getByRole('button', { name: 'Listagem', exact: true }).click();
    const table = page.getByRole('table', { name: 'Veículos no pátio' });
    await table.waitFor();
    assert.equal(await table.locator('tbody tr').count(), data.itens.length);
    await singleFilter.click();
    assert.equal(await table.locator('tbody tr').count(), single.length);
    await allFilter.click();
    assert.equal(await table.locator('tbody tr').count(), data.itens.length);
    const row = table.getByRole('row').filter({ hasText: plate });
    assert.equal(await row.getByRole('button', { name: 'Conferir saída de ' + plate }).isDisabled(), true, 'Turno do admin está fechado.');
    await noOverflow(page);
    await capture(page, 'listagem-desktop');
    await table.screenshot({ path: resolve(output, 'listagem-tabela-desktop.png') });
    await page.reload();
    await table.waitFor();
    assert.equal(await page.getByRole('button', { name: 'Listagem', exact: true }).getAttribute('aria-pressed'), 'true');
    const eventRow = table.locator('tbody tr').filter({ hasText: /PATIO-/ }).first();
    assert.match(await eventRow.innerText(), /Pago na entrada|Receber na saída/);
    const correct = eventRow.getByRole('button', { name: /Corrigir registro de/ });
    const targetPlate = (await correct.getAttribute('aria-label')).replace('Corrigir registro de ', '');
    await correct.click();
    const correction = page.getByRole('dialog', { name: 'Corrigir registro · ' + targetPlate });
    await correction.waitFor();
    await correction.getByRole('button', { name: 'Voltar', exact: true }).click();
    await correction.waitFor({ state: 'hidden' });
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      const list = page.getByRole('list', { name: 'Veículos no pátio em listagem' });
      await list.waitFor();
      assert.equal(await list.getByRole('listitem').count(), data.itens.length);
      await monthlyFilter.click();
      assert.equal(await list.getByRole('listitem').count(), monthly.length);
      await allFilter.click();
      await page.getByLabel('Buscar placa no pátio').fill(plate);
      const targetFilter = data.itens[0].tipo === 'MENSALISTA' ? monthlyFilter : singleFilter;
      await targetFilter.click();
      assert.equal(await list.getByRole('listitem').count(), 1);
      await page.getByRole('button', { name: 'Cartões', exact: true }).click();
      assert.equal(await cards.getByRole('listitem').count(), 1);
      assert.equal(await page.getByLabel('Buscar placa no pátio').inputValue(), plate);
      assert.equal(await targetFilter.getAttribute('aria-pressed'), 'true');
      await noOverflow(page);
      await capture(page, 'cartoes-mobile-' + width);
      await page.getByRole('button', { name: 'Listagem', exact: true }).click();
      await noOverflow(page);
      await capture(page, 'listagem-mobile-' + width);
      await list.screenshot({ path: resolve(output, 'listagem-linhas-mobile-' + width + '.png') });
      await page.getByRole('button', { name: 'Limpar filtros', exact: true }).click();
      assert.equal(await allFilter.getAttribute('aria-pressed'), 'true');
    }
    assert.deepEqual(admin.forbiddenWrites, []);
    await admin.context.close();
    console.log('PASS: admin, filtros por tipo+placa nos dois formatos, limpeza e estado vazio, preferência após reload, mobile320/390.');
    const cash = await login(browser, 'demo.caixa');
    await cash.page.getByRole('list', { name: 'Veículos no pátio em cartões' }).waitFor();
    await cash.page.getByRole('button', { name: 'Listagem', exact: true }).click();
    const cashTable = cash.page.getByRole('table', { name: 'Veículos no pátio' });
    await cashTable.waitFor();
    assert.equal(await cashTable.getByRole('button', { name: /Corrigir registro de/ }).count(), 0);
    const target = cash.data.itens[0];
    const filterName = target.tipo === 'MENSALISTA'
      ? 'Mostrar mensalistas: ' + cash.data.resumo.mensalistas : 'Mostrar avulsos: ' + cash.data.resumo.avulsos;
    await cash.page.getByRole('button', { name: filterName }).click();
    await cash.page.getByLabel('Buscar placa no pátio').fill(target.placa);
    assert.equal(await cashTable.locator('tbody tr').count(), 1);
    const preview = cash.page.waitForResponse((r) => r.request().method() === 'POST'
      && new URL(r.url()).pathname === `/api/v1/patio/movimentacoes/${target.movimentacaoId}/previa-saida`);
    await cashTable.getByRole('button', { name: 'Conferir saída de ' + target.placa }).click();
    assert.equal((await preview).status(), 200);
    const exit = cash.page.getByRole('dialog', { name: 'Conferir saída', exact: true });
    await exit.getByText(target.placa, { exact: true }).waitFor();
    await exit.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await exit.waitFor({ state: 'hidden' });
    assert.deepEqual(cash.forbiddenWrites, []);
    await cash.context.close();
    console.log('PASS: Caixa sem correção indevida; listagem abriu prévia do movimento exato sem registrar saída/pagamento.');
    console.log('Evidências: ' + output);
  } finally { await browser.close(); }
}
run().catch((error) => { console.error(error.message); process.exitCode = 1; });
