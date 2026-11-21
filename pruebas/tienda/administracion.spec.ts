import { GORRA, TIENDA } from '../apoyo/entorno';
import { agregarAlCarrito, confirmarPedido, expect, llenarEntrega, test } from '../apoyo/tienda';

test.describe('Panel de administración', () => {
  test('pide usuario y contraseña', async ({ request }) => {
    const sinClave = await request.get('/admin/orders');
    expect(sinClave.status()).toBe(401);
    expect(sinClave.headers()['www-authenticate']).toContain('Basic');

    const claveMala = await request.get('/admin/orders', {
      headers: { Authorization: `Basic ${Buffer.from(`${TIENDA.admin.usuario}:otra-clave`).toString('base64')}` },
    });
    expect(claveMala.status()).toBe(401);
  });

  test('el pedido de un cliente aparece en el panel y se le cambia el estado', async ({ page, browser }) => {
    await agregarAlCarrito(page, GORRA.id, GORRA.talla);
    await page.goto('/productCart');
    await llenarEntrega(page);
    const respuesta = page.waitForResponse((r) => r.url().endsWith('/api/orders'));
    await confirmarPedido(page).click();
    const { code, number } = await (await respuesta).json();

    const admin = await browser.newContext({
      baseURL: TIENDA.url,
      httpCredentials: { username: TIENDA.admin.usuario, password: TIENDA.admin.clave },
    });
    const panel = await admin.newPage();
    await panel.goto('/admin/orders');
    await expect(panel.getByRole('heading', { level: 1 })).toHaveText('Tus pedidos.');
    await panel.getByRole('link', { name: code }).first().click();
    await expect(panel).toHaveURL(new RegExp(`/admin/orders/${number}$`));
    await expect(panel.getByRole('heading', { level: 1 })).toHaveText(`Pedido ${code}.`);
    await expect(panel.locator('main')).toContainText(GORRA.nombre);

    await panel.getByRole('combobox', { name: 'Estado del pedido' }).selectOption({ label: 'Confirmado' });
    await panel.getByRole('button', { name: /GUARDAR ESTADO/ }).click();
    await panel.reload();
    await expect(panel.getByRole('combobox', { name: 'Estado del pedido' })).toHaveValue(/confirmado/i);

    await panel.goto('/admin/orders?estado=confirmado');
    await expect(panel.getByRole('link', { name: code }).first()).toBeVisible();
    await admin.close();
  });
});
