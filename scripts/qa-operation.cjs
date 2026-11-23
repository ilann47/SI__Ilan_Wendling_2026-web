/* Teste real opt-in: cria somente fixtures sintéticas no backend local de QA. */
const { chromium, request } = require('C:/Users/ilan.wendling/claude/yes7parking/yes7parking-web/node_modules/playwright-core');
const assert = require('node:assert/strict');
const { randomUUID, randomInt } = require('node:crypto');
const { mkdir } = require('node:fs/promises');
const { resolve } = require('node:path');

const baseURL = process.env.QA_WEB_URL || 'http://127.0.0.1:5174';
assert.equal(new URL(baseURL).hostname, '127.0.0.1', 'Este teste só pode rodar no loopback de QA.');
assert.equal(new URL(baseURL).port, '5174', 'Este teste foi reservado para a prévia 5174.');
const suffix = randomUUID().slice(0, 8);
const orgName = 'QA Operação completa ' + suffix;
const screenshots = resolve(__dirname, '../../../qa-operation-screenshots-' + suffix);
const headers = (token) => ({ Authorization: 'Bearer ' + token });
function cnpj() {
  const digit = (input, weights) => {
    const remainder = [...input].reduce((sum, n, i) => sum + Number(n) * weights[i], 0) % 11;
    return remainder < 2 ? '0' : String(11 - remainder);
  };
  const root = String(randomInt(10000000, 99999999)) + '0001';
  const first = root + digit(root, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return first + digit(first, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
}
async function body(response, status = 200) {
  assert.equal(response.status(), status, new URL(response.url()).pathname);
  return response.json();
}
const money = (text) => Number(text).toFixed(6);
async function run() {
  const api = await request.newContext({ baseURL });
  let browser;
  try {
    await mkdir(screenshots, { recursive: true });
    assert.equal((await api.get('/actuator/health')).status(), 200);
    const register = async (role) => {
      const login = role + '.qa.' + suffix;
      const senha = 'Qa!' + randomUUID();
      const result = await body(await api.post('/api/auth/register', {
        data: { login, senha, nome: 'QA ' + role, email: login + '@example.test' },
      }), 201);
      return { login, senha, ...result };
    };
    const admin = await register('admin');
    const org = await body(await api.post('/api/v1/me/organizations', {
      headers: headers(admin.token), data: { document: cnpj(), legalName: orgName,
        currency: 'BRL', timeZone: 'America/Sao_Paulo', region: 'BR-PR', plan: 'STANDARD' },
    }), 201);
    const activate = async (account) => headers((await body(await api.post('/api/v1/me/active-organization', {
      headers: headers(account.token), data: { organizationId: org.organization.id },
    }))).token);
    let adminHeaders = await activate(admin);
    const memberships = '/api/v1/organizations/' + org.organization.id + '/memberships';
    await body(await api.post(memberships + '/' + org.membership.id + '/role-assignments', {
      headers: adminHeaders, data: { roleCode: 'SUPERVISOR' },
    }), 201);
    adminHeaders = await activate(admin);
    const bind = async (account, roleCode) => {
      const membership = await body(await api.post(memberships, { headers: adminHeaders, data: { userId: account.id } }), 201);
      await body(await api.post(memberships + '/' + membership.id + '/role-assignments', {
        headers: adminHeaders, data: { roleCode },
      }), 201);
      return activate(account);
    };
    const caixa = await register('caixa');
    const caixaHeaders = await bind(caixa, 'CAIXA_PATIO');
    const gestor = await register('gestor');
    const gestorHeaders = await bind(gestor, 'GESTOR');
    const cities = await body(await api.get('/api/v1/installation-cities', { headers: adminHeaders }));
    assert.ok(cities.content?.length, 'É necessário um município ativo no catálogo de teste.');
    const address = { address: 'Rua QA', district: 'Centro', postalCode: '85000-000', cityId: cities.content[0].id };
    const venue = await body(await api.post('/api/v1/venues', { headers: adminHeaders,
      data: { ...address, name: 'Arena QA ' + suffix, timeZone: 'America/Sao_Paulo' } }), 201);
    const makeEvent = async (mode, label) => {
      const facility = await body(await api.post('/api/v1/parking-facilities', { headers: adminHeaders,
        data: { ...address, name: 'Pátio ' + label, physicalCapacity: 10, operationalCapacity: 10, active: true } }), 201);
      const startsAt = new Date(Date.now() - 30 * 60_000).toISOString();
      const endsAt = new Date(Date.now() + 6 * 60 * 60_000).toISOString();
      let event = await body(await api.post('/api/v1/events', {
        headers: { ...adminHeaders, 'Idempotency-Key': randomUUID() },
        data: { name: 'Festival ' + label, venueId: venue.id, startsAt, endsAt, timeZone: 'America/Sao_Paulo' },
      }), 201);
      event = await body(await api.patch('/api/v1/events/' + event.id, { headers: { ...adminHeaders, 'If-Match': '"' + event.version + '"' },
        data: { reentryPolicy: 'ENTRADA_UNICA' } }));
      await body(await api.post('/api/v1/events/' + event.id + '/parking-allocations', {
        headers: { ...adminHeaders, 'Idempotency-Key': randomUUID() },
        data: { parkingFacilityId: facility.id, startsAt, endsAt, operationalCapacity: 10, sellableCapacity: 0, reservedCapacity: 0 },
      }), 201);
      await body(await api.put('/api/v1/events/' + event.id + '/cobranca-patio', {
        headers: adminHeaders, data: { modo: mode, valor: '25.123456' },
      }));
      const current = await body(await api.get('/api/v1/events/' + event.id, { headers: adminHeaders }));
      event = await body(await api.post('/api/v1/events/' + event.id + '/patio-operation-start', {
        headers: { ...adminHeaders, 'If-Match': '"' + current.version + '"' }, data: { confirmed: true },
      }));
      assert.equal(event.status, 'EM_OPERACAO');
      return { ...event, patioId: facility.id, patioNome: facility.name };
    };
    const pre = await makeEvent('ENTRADA', 'Entrada ' + suffix);
    const post = await makeEvent('SAIDA', 'Saída ' + suffix);
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const pages = [];
    const open = async (account, mobile = true) => {
      const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, isMobile: mobile });
      const page = await context.newPage();
      await page.addInitScript(() => { window.print = () => { window.qaPrintCount = (window.qaPrintCount || 0) + 1; }; });
      pages.push(page);
      await page.goto(baseURL + '/login');
      await page.getByLabel('Login', { exact: true }).fill(account.login);
      await page.getByLabel('Senha', { exact: true }).fill(account.senha);
      await page.getByRole('button', { name: 'Entrar', exact: true }).click();
      await page.getByRole('heading', { name: 'Escolha a organização' }).waitFor();
      await page.locator('.MuiCard-root').filter({ hasText: orgName }).getByRole('button', { name: 'Entrar', exact: true }).click();
      if (account.login.startsWith('caixa.')) {
        await page.getByRole('tab', { name: 'Portaria', exact: true }).waitFor();
        assert.ok(page.url().endsWith('/app/patio'), 'Caixa deve abrir diretamente na Portaria após escolher organização.');
      } else await page.getByText('Olá, ' + account.login.split('.')[0], { exact: false }).first().waitFor();
      return page;
    };
    const module = async (page, name) => {
      if (name === 'Pátio' && page.url().endsWith('/app/patio')) return;
      const mobileMenu = page.getByRole('button', { name: 'Abrir áreas e processos' });
      if (await mobileMenu.isVisible()) {
        await mobileMenu.click();
        const drawer = page.getByRole('dialog', { name: 'Áreas e processos' });
        await drawer.getByRole('button', { name: 'Operação', exact: true }).click();
        await drawer.getByRole('link', { name, exact: true }).click();
      } else {
        await page.getByRole('button', { name: 'Operação', exact: true }).click();
        await page.getByRole('link', { name, exact: true }).click();
      }
    };
    const noHorizontal = async (page) => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1),
      'A tela mobile não pode ter rolagem horizontal.');
    const openShift = async (page, fund = '0') => {
      await page.getByRole('tab', { name: 'Portaria', exact: true }).click();
      await page.getByRole('button', { name: 'Abrir turno', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Abrir turno' });
      await dialog.getByLabel('Fundo de troco').fill(fund);
      await dialog.getByRole('button', { name: 'Confirmar abertura' }).click();
      await page.getByText(/Turno aberto ·/).waitFor();
    };
    const closeShift = async (page, counted) => {
      await page.getByRole('tab', { name: 'Caixa', exact: true }).click();
      await page.getByRole('button', { name: 'Fechar caixa', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Fechar caixa' });
      await dialog.getByLabel('Dinheiro contado').fill(counted);
      await dialog.getByRole('button', { name: 'Confirmar fechamento' }).click();
      await page.getByText('Último fechamento', { exact: true }).waitFor();
    };
    const choose = async (page, event) => {
      await page.getByRole('tab', { name: 'Portaria', exact: true }).click();
      const change = page.getByRole('button', { name: 'Trocar operação', exact: true });
      if (await change.isVisible()) {
        await change.click();
        await page.getByRole('button', { name: 'Escolher outra operação' }).click();
      }
      await page.getByRole('combobox', { name: 'Evento e pátio' }).click();
      await page.getByRole('option').filter({ hasText: event.name }).click();
      await page.getByRole('heading', { name: event.name + ' · ' + event.patioNome }).waitFor();
    };
    const cashier = await open(caixa);
    await module(cashier, 'Pátio');
    await openShift(cashier);
    await choose(cashier, pre);
    await cashier.context().setOffline(true);
    await cashier.getByText(/Sem conexão\. Entradas, saídas e alterações de caixa estão bloqueadas/).waitFor();
    assert.equal(await cashier.getByRole('button', { name: 'Conferir pagamento da entrada' }).isDisabled(), true);
    await cashier.context().setOffline(false);
    await cashier.getByText(/Sem conexão\. Entradas, saídas e alterações de caixa estão bloqueadas/).waitFor({ state: 'hidden' });
    for (const width of [320, 390, 1440]) {
      await cashier.setViewportSize({ width, height: 900 });
      await noHorizontal(cashier);
      await cashier.screenshot({ path: resolve(screenshots, `00-portaria-${width}.png`), fullPage: true });
    }
    await cashier.setViewportSize({ width: 390, height: 844 });
    await cashier.getByLabel('Placa', { exact: true }).fill('QAE1A01');
    await cashier.getByRole('button', { name: 'Conferir pagamento da entrada' }).click();
    const payment = cashier.getByRole('dialog', { name: 'Pagamento na entrada' });
    await payment.getByRole('radio', { name: 'Dinheiro', exact: true }).click();
    await payment.getByLabel('Valor recebido').fill('30');
    await payment.getByText('R$ 4,88', { exact: true }).waitFor();
    const [entryResponse] = await Promise.all([
      cashier.waitForResponse((r) => r.request().method() === 'POST' && r.url().endsWith('/api/v1/patio/entradas')),
      payment.getByRole('button', { name: 'Registrar pagamento e entrada' }).click(),
    ]);
    const entry = await body(entryResponse, 201);
    assert.equal(money(entry.troco), '4.880000');
    assert.equal(money(entry.evento.valor), '25.120000');
    assert.equal(entry.evento.ordemServicoStatus, 'EM_EXECUCAO');
    const osId = entry.evento.ordemServicoId;
    assert.ok(osId);
    assert.equal(await cashier.getByRole('button', { name: 'Corrigir registro de QAE1A01' }).count(), 0);
    await cashier.getByRole('button', { name: 'Ver comprovante da entrada' }).click();
    await cashier.getByRole('button', { name: 'Imprimir segunda via' }).click();
    assert.equal(await cashier.evaluate(() => window.qaPrintCount), 1);
    await cashier.screenshot({ path: resolve(screenshots, '01-recibo-mobile.png'), fullPage: true });
    await cashier.getByRole('dialog', { name: 'Comprovante do estacionamento' }).getByRole('button', { name: 'Fechar', exact: true }).click();
    await cashier.reload();
    await cashier.getByRole('heading', { name: pre.name + ' · ' + pre.patioNome }).waitFor();
    assert.equal(await cashier.getByRole('combobox', { name: 'Evento e pátio' }).count(), 0, 'Contexto deve permanecer fixado após reload.');
    await cashier.getByLabel('Placa para saída').fill('QAE1A01');
    await cashier.getByRole('button', { name: 'Buscar saída' }).click();
    await cashier.getByRole('button', { name: 'Conferir saída encontrada de QAE1A01' }).click();
    const release = cashier.getByRole('dialog', { name: 'Conferir saída' });
    await release.getByText(/Não cobre novamente/).waitFor();
    await release.getByRole('button', { name: 'Confirmar saída', exact: true }).click();
    await cashier.getByText(/NFS-e pendente de emissão/).first().waitFor();
    let fiscal = await body(await api.get('/api/v1/patio/movimentacoes/' + entry.id + '/fiscal-evento', { headers: caixaHeaders }));
    assert.equal(fiscal.ordemServicoId, osId);
    assert.equal(fiscal.ordemServicoStatus, 'CONCLUIDA');
    assert.equal(fiscal.fiscalStatus, 'PENDENTE_EMISSAO');
    let cash = await body(await api.get('/api/v1/patio/caixa', { headers: caixaHeaders }));
    assert.equal(money(cash.aberto.totalRecebido), '25.120000', 'Saída pré-paga não cobra duas vezes.');
    await noHorizontal(cashier);
    await cashier.screenshot({ path: resolve(screenshots, '02-saida-mobile.png'), fullPage: true });
    await cashier.getByRole('tab', { name: 'Caixa', exact: true }).click();
    const cashMovement = async (label, value, loseResponse = false) => {
      await cashier.getByRole('button', { name: 'Registrar ' + label }).click();
      const dialog = cashier.getByRole('dialog', { name: label === 'suprimento' ? 'Suprimento do caixa' : 'Sangria do caixa' });
      await dialog.getByLabel('Valor do movimento').fill(value);
      await dialog.getByLabel('Motivo do movimento').fill('Movimento sintético para validar conferência do caixa.');
      if (loseResponse) {
        let sent;
        const routePattern = '**/api/v1/patio/turnos/*/movimentos-dinheiro';
        const lose = async (route) => {
          if (route.request().method() !== 'POST') { await route.continue(); return; }
          sent = route.request().postDataJSON();
          const applied = await route.fetch();
          assert.equal(applied.status(), 200);
          await route.abort('failed');
          await cashier.unroute(routePattern, lose);
        };
        await cashier.route(routePattern, lose);
        await dialog.getByRole('button', { name: 'Confirmar movimento' }).click();
        await dialog.getByText(/Resultado ainda não confirmado/).waitFor();
        await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
        await dialog.waitFor({ state: 'hidden' });
        await cashier.getByRole('tab', { name: 'Portaria', exact: true }).click();
        await cashier.reload();
        await cashier.getByRole('tab', { name: 'Caixa', exact: true }).click();
        await cashier.getByRole('button', { name: 'Retomar movimento pendente' }).click();
        await dialog.getByRole('button', { name: 'Verificar resultado' }).click();
        await dialog.getByText(/Movimento confirmado no histórico\. Não será lançado novamente/).waitFor();
        const history = await body(await api.get('/api/v1/patio/turnos/' + cash.aberto.id + '/movimentos-dinheiro', { headers: caixaHeaders }));
        assert.equal(history.filter((row) => row.chave === sent.chave).length, 1, 'Resposta perdida não pode duplicar movimento.');
        await dialog.getByRole('button', { name: 'Novo movimento', exact: true }).click();
        await dialog.waitFor({ state: 'hidden' });
        return;
      }
      const [response] = await Promise.all([
        cashier.waitForResponse((r) => r.request().method() === 'POST' && r.url().endsWith('/movimentos-dinheiro')),
        dialog.getByRole('button', { name: 'Confirmar movimento' }).click(),
      ]);
      await body(response, 200);
      await dialog.waitFor({ state: 'hidden' });
      // Repetição real da mesma chave não deve duplicar o dinheiro do turno.
      const replay = await api.post(new URL(response.url()).pathname, { headers: caixaHeaders, data: response.request().postDataJSON() });
      assert.ok([200, 201].includes(replay.status()));
    };
    await cashMovement('suprimento', '5', true);
    await cashMovement('sangria', '2');
    cash = await body(await api.get('/api/v1/patio/caixa', { headers: caixaHeaders }));
    assert.equal(money(cash.aberto.totalRecebido), '25.120000', 'Dinheiro de suprimento não é receita.');
    assert.equal(money(cash.aberto.dinheiroEsperado), '28.120000');
    const concurrent = await Promise.all([1, 2].map(() => api.post('/api/v1/patio/turnos/' + cash.aberto.id + '/movimentos-dinheiro', {
      headers: caixaHeaders, data: { chave: randomUUID(), tipo: 'SANGRIA', valor: '20', motivo: 'Retirada concorrente sintética de teste' },
    })));
    assert.deepEqual(concurrent.map((r) => r.status()).sort(), [200, 409], 'Não pode haver duas retiradas acima do saldo disponível.');
    await body(await api.post('/api/v1/patio/turnos/' + cash.aberto.id + '/movimentos-dinheiro', {
      headers: caixaHeaders, data: { chave: randomUUID(), tipo: 'SUPRIMENTO', valor: '20', motivo: 'Reposição do dinheiro retirado no teste' },
    }));
    await closeShift(cashier, '28.12');
    const denied = await api.post('/api/v1/patio/movimentacoes/' + entry.id + '/correcao', {
      headers: caixaHeaders, data: { chave: randomUUID(), acao: 'CANCELAR_ESTADIA', motivo: 'Correção proibida do perfil caixa' },
    });
    assert.equal(denied.status(), 403);
    assert.equal((await api.get('/api/v1/me/permissions', { headers: caixaHeaders })).status(), 200);
    console.log('PASS: mobile pré-pago em centavos, troco, recibo, contexto, sem duplicação, suprimento/sangria idempotentes e Caixa sem correções.');
    const supervisor = await open(admin);
    await module(supervisor, 'Pátio');
    await openShift(supervisor, '30');
    await supervisor.getByRole('tab', { name: 'Supervisão', exact: true }).click();
    await supervisor.getByRole('heading', { name: 'Supervisão dos turnos' }).waitFor();
    await supervisor.getByRole('heading', { name: new RegExp('QA caixa.*Fechado') }).waitFor();
    await supervisor.screenshot({ path: resolve(screenshots, '03-supervisao-desktop.png'), fullPage: true });
    await supervisor.getByRole('tab', { name: 'Comprovantes', exact: true }).click();
    await supervisor.getByLabel('Placa do comprovante').fill('QAE1A01');
    await supervisor.getByRole('button', { name: 'Consultar comprovantes' }).click();
    await supervisor.getByRole('button', { name: 'Corrigir registro de QAE1A01' }).click();
    const correction = supervisor.getByRole('dialog', { name: 'Corrigir registro · QAE1A01' });
    await correction.getByRole('combobox', { name: 'O que corrigir' }).click();
    await supervisor.getByRole('option', { name: 'Cancelar estadia registrada por engano' }).click();
    await correction.getByLabel('Motivo da correção').fill('Estadia sintética cancelada com devolução conferida no teste.');
    await correction.getByRole('button', { name: 'Confirmar correção' }).click();
    await correction.waitFor({ state: 'hidden' });
    fiscal = await body(await api.get('/api/v1/patio/movimentacoes/' + entry.id + '/fiscal-evento', { headers: adminHeaders }));
    assert.equal(fiscal.ordemServicoId, osId);
    assert.equal(fiscal.ordemServicoStatus, 'CANCELADA');
    assert.equal(fiscal.fiscalStatus, 'CANCELADA');
    assert.equal(money(fiscal.valorPago), '0.000000');
    const canceledReceipt = await body(await api.get('/api/v1/patio/movimentacoes/' + entry.id + '/comprovante', { headers: adminHeaders }));
    assert.equal(canceledReceipt.cancelada, true);
    assert.equal(money(canceledReceipt.valor), '25.120000', 'Recibo original deve ser preservado.');
    cash = await body(await api.get('/api/v1/patio/caixa', { headers: adminHeaders }));
    assert.equal(money(cash.aberto.dinheiroEsperado), '4.880000');
    await closeShift(supervisor, '4.88');
    const summary = await body(await api.get('/api/v1/events/' + pre.id + '/patio-operation-summary', { headers: adminHeaders }));
    assert.equal(money(summary.financeiro.total), '0.000000');
    assert.equal(summary.fiscal.pendentes, 0);
    console.log('PASS: supervisor cancela com devolução no turno atual, preserva comprovante e cancela OS/pendência fiscal sem receber novamente.');
    await openShift(cashier);
    await choose(cashier, post);
    await cashier.getByLabel('Placa', { exact: true }).fill('QAS1A02');
    const [postEntryResponse] = await Promise.all([
      cashier.waitForResponse((r) => r.request().method() === 'POST' && r.url().endsWith('/api/v1/patio/entradas')),
      cashier.getByRole('button', { name: 'Registrar entrada', exact: true }).click(),
    ]);
    const postEntry = await body(postEntryResponse, 201);
    await cashier.getByLabel('Placa para saída').fill('QAS1A02');
    await cashier.getByRole('button', { name: 'Buscar saída' }).click();
    await cashier.getByRole('button', { name: 'Conferir saída encontrada de QAS1A02' }).click();
    const postPayment = cashier.getByRole('dialog', { name: 'Conferir saída' });
    await postPayment.getByRole('radio', { name: 'Cartão', exact: true }).click();
    await postPayment.getByRole('button', { name: 'Registrar pagamento e saída' }).click();
    await cashier.getByText(/Saída registrada: QAS1A02/).waitFor();
    const postFiscal = await body(await api.get('/api/v1/patio/movimentacoes/' + postEntry.id + '/fiscal-evento', { headers: caixaHeaders }));
    assert.equal(postFiscal.ordemServicoId, postEntry.evento.ordemServicoId);
    assert.equal(postFiscal.fiscalStatus, 'PENDENTE_EMISSAO');
    assert.equal(postFiscal.ordemServicoStatus, 'CONCLUIDA');
    cash = await body(await api.get('/api/v1/patio/caixa', { headers: caixaHeaders }));
    assert.equal(money(cash.aberto.cartao), '25.120000');
    await closeShift(cashier, '0');
    const postSummary = await body(await api.get('/api/v1/events/' + post.id + '/patio-operation-summary', { headers: adminHeaders }));
    assert.equal(money(postSummary.financeiro.total), '25.120000');
    assert.equal(postSummary.fiscal.pendentes, 1);
    console.log('PASS: pós-pago cartão, OS única concluída, NFS-e pendente e fechamento sem diferença.');
    await supervisor.goto(baseURL + '/app/ordens-servico?detail=' + postFiscal.ordemServicoId);
    await supervisor.getByRole('heading', { name: 'NFS-e da estadia', exact: true }).waitFor();
    await supervisor.getByText('NFS-e pendente de emissão', { exact: true }).waitFor();
    assert.equal(await supervisor.getByRole('button', { name: 'Gerar nota de serviço', exact: true }).count(), 0);
    await supervisor.screenshot({ path: resolve(screenshots, '04-os-nfse-desktop.png'), fullPage: true });
    await cashier.goto(baseURL + '/app/administracao');
    await cashier.getByText('Acesso não autorizado', { exact: true }).waitFor();
    assert.ok(!cashier.url().includes('/login'), 'Negativa de acesso não pode deslogar.');
    await cashier.goto(baseURL + '/app/patio');
    await cashier.getByRole('tab', { name: 'Portaria', exact: true }).waitFor();
    const manager = await open(gestor, false);
    await module(manager, 'Eventos e ofertas');
    await manager.getByRole('row').filter({ hasText: post.name }).getByRole('button', { name: 'Selecionar', exact: true }).click();
    await manager.getByRole('heading', { name: 'Resumo da portaria' }).waitFor();
    const managerSummary = await body(await api.get('/api/v1/events/' + post.id + '/patio-operation-summary', { headers: gestorHeaders }));
    assert.equal(managerSummary.eventoId, post.id);
    await manager.screenshot({ path: resolve(screenshots, '03-gestor-desktop.png'), fullPage: true });
    console.log('PASS: gestor desktop visualiza resumo com projeção limitada às permissões efetivas.');
    const peak = await makeEvent('SAIDA', 'Pico sintético ' + suffix);
    const secondCashier = await register('caixa2');
    const secondHeaders = await bind(secondCashier, 'CAIXA_PATIO');
    const shiftA = await body(await api.post('/api/v1/patio/turnos', { headers: caixaHeaders, data: { fundoTroco: '0' } }), 201);
    const shiftB = await body(await api.post('/api/v1/patio/turnos', { headers: secondHeaders, data: { fundoTroco: '0' } }), 201);
    const peakStart = Date.now();
    const arrivals = await Promise.all(Array.from({ length: 16 }, async (_, index) => {
      const auth = index % 2 ? secondHeaders : caixaHeaders;
      const response = await api.post('/api/v1/patio/entradas', { headers: auth, data: {
        placa: 'QCX' + (1000 + index), patioId: peak.patioId, eventoId: peak.id, chaveEntrada: randomUUID(),
      } });
      assert.ok([201, 409].includes(response.status()), 'Capacidade precisa resultar em entrada ou conflito explícito.');
      return response.status() === 201 ? { entry: await response.json(), auth, shift: index % 2 ? shiftB : shiftA } : null;
    }));
    const accepted = arrivals.filter(Boolean);
    assert.equal(accepted.length, 10, 'Pico com dois operadores não pode ultrapassar 10 vagas.');
    const peakSummary = await body(await api.get('/api/v1/events/' + peak.id + '/patio-operation-summary', { headers: adminHeaders }));
    assert.equal(peakSummary.operacao.abertos, 10);
    for (const arrival of accepted) {
      const preview = await body(await api.post('/api/v1/patio/movimentacoes/' + arrival.entry.id + '/previa-saida', { headers: arrival.auth, data: {} }));
      await body(await api.post('/api/v1/patio/movimentacoes/' + arrival.entry.id + '/saida', { headers: arrival.auth,
        data: { turnoId: arrival.shift.id, chave: preview.chave, meio: 'PIX' } }));
    }
    for (const [auth, shift] of [[caixaHeaders, shiftA], [secondHeaders, shiftB]]) {
      await body(await api.post('/api/v1/patio/turnos/' + shift.id + '/fechamento', { headers: auth, data: { dinheiroContado: '0' } }));
    }
    const peakClosed = await body(await api.get('/api/v1/events/' + peak.id + '/patio-operation-summary', { headers: adminHeaders }));
    assert.equal(peakClosed.operacao.abertos, 0);
    assert.equal(peakClosed.operacao.encerrados, 10);
    assert.equal(money(peakClosed.financeiro.total), '251.200000');
    console.log('PASS: pico sintético local, 16 tentativas/2 operadores/10 vagas, todas as 10 saídas conciliadas; duração ' + (Date.now() - peakStart) + ' ms. Não é benchmark de produção.');
    for (const page of [cashier, supervisor]) await noHorizontal(page);
    console.log('QA concluído; screenshots em ' + screenshots);
  } finally {
    await browser?.close();
    await api.dispose();
  }
}
run().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
