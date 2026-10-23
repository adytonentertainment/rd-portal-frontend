// End-to-end flows an admin relies on to fix the roster themselves. The crawl
// proves a control does SOMETHING; these prove it does the right thing.
const { test, expect } = require('@playwright/test');
const { API } = require('./global-setup');

const XRW = { 'X-Requested-With': 'XMLHttpRequest' };

async function findWriter(request, name) {
  const res = await request.get(`${API}/admin/writers`, { params: { search: name, page_size: 5 } });
  const items = (await res.json()).items || [];
  return items.find((w) => w.canonical_name === name) || items[0];
}

const detail = async (request, id) => (await request.get(`${API}/admin/writers/${id}`)).json();

test('Move: a payee code moves to the client picked, statements and all', async ({ page, request }) => {
  const source = await findWriter(request, 'Rata Blanca');
  const before = await detail(request, source.id);
  const account = before.accounts.find((a) => a.account_code === 'C00122') || before.accounts[0];
  const target = await findWriter(request, 'B-Legit');
  expect(target.id).not.toBe(source.id);

  await page.goto(`/admin/writers/${source.id}`);
  const row = page.locator('div', { has: page.locator('code', { hasText: account.account_code }) }).last();
  await row.getByRole('button', { name: 'Move' }).click();

  const dialog = page.getByText(`Move ${account.account_code} to another client`);
  await expect(dialog).toBeVisible();
  await page.getByPlaceholder('Search clients by name, payee or email').fill(target.canonical_name);
  await page
    .getByRole('button', { name: new RegExp(`^${target.canonical_name}`) })
    .first()
    .click();
  await page.getByRole('button', { name: `Move to ${target.canonical_name}` }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('code', { hasText: account.account_code })).toHaveCount(0);

  const moved = await detail(request, target.id);
  expect(moved.accounts.map((a) => a.account_code)).toContain(account.account_code);

  // Put it back, so the rest of the run sees the roster it started with.
  const back = await request.post(`${API}/admin/writers/${target.id}/accounts/${account.id}/move`, {
    data: { target_writer_id: source.id },
    headers: XRW,
  });
  expect(back.ok()).toBeTruthy();
});

test('Delete statement: the confirmation opens and Cancel leaves it alone', async ({ page, request }) => {
  const source = await findWriter(request, 'Rata Blanca');
  const count = (await detail(request, source.id)).statements.length;
  await page.goto(`/admin/writers/${source.id}`);
  await page.getByRole('button', { name: 'Delete' }).first().click();
  await expect(page.getByRole('button', { name: 'Delete statement' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('button', { name: 'Delete statement' })).toBeHidden();
  expect((await detail(request, source.id)).statements.length).toBe(count);
});

test('Beneficiary codes: add one to a client, refuse a commission code, remove it again', async ({ page, request }) => {
  const client = await findWriter(request, 'Rata Blanca');
  await page.goto(`/admin/writers/${client.id}`);
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  const field = page.getByPlaceholder('Add a code, e.g. C00122 or CSJ042');
  // The code field's own Add (the contact field has one too).
  const add = page.locator('div', { has: field }).last().getByRole('button', { name: 'Add', exact: true });

  await field.fill('CS9999');
  await add.click();
  await expect(page.getByText(/is a commission code/)).toBeVisible();

  await field.fill('c09999');
  await add.click();
  const row = page.locator('div', { has: page.locator('code', { hasText: 'C09999' }) }).last();
  await expect(row).toBeVisible();
  const codes = async () => (await detail(request, client.id)).accounts.map((a) => a.account_code);
  expect(await codes()).toContain('C09999');

  await row.getByRole('button', { name: 'Remove' }).click();
  await expect(page.locator('code', { hasText: 'C09999' })).toHaveCount(0);
  expect(await codes()).not.toContain('C09999');
});

test('Roster round trip: Export roster, upload it unchanged, nothing to change', async ({ page }) => {
  await page.goto('/admin/writers');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export roster' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^rd-roster-\d{4}-\d{2}-\d{2}\.xlsx$/);
  const file = await download.path();

  await page.locator('input[type=file][accept=".xlsx"]').setInputFiles(file);
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText(/rows read\. Nothing to change\./)).toBeVisible({ timeout: 60000 });
  await expect(dialog.getByRole('button', { name: /^Apply/ })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toBeHidden();
});
