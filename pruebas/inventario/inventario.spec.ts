import { test } from '@playwright/test';
import { GORRA, INVENTARIO, JEAN } from '../apoyo/entorno';
import { aviso, entrarInventario, expect, registrarMovimiento, unidadesDeTalla } from '../apoyo/inventario';

test.describe('Inventario como administrador', () => {
  test.describe.configure({ mode: 'serial' });

  test('con una contraseña incorrecta no entra', async ({ browser }) => {
    const contexto = await browser.newContext({ baseURL: INVENTARIO.url, storageState: { cookies: [], origins: [] } });
    const page = await contexto.newPage();
    await entrarInventario(page, INVENTARIO.admin.usuario, 'clave-equivocada-123');
    await expect(page.getByRole('alert')).toHaveText('Usuario o contraseña incorrectos');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('VisagStock');
    await contexto.close();
  });

  test('muestra los productos y tallas que vienen de VisagShop', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.cifra').filter({ hasText: 'Productos' }).locator('strong')).toHaveText('108');
    await page.goto(`/productos/${JEAN.id}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(JEAN.nombre);
    const tallas = await page.locator('.tabla-tallas tbody th').allInnerTexts();
    expect(tallas.map((t) => t.trim())).toEqual(JEAN.tallas);
  });

  test('un ingreso real sube el stock y queda en el kárdex', async ({ page }) => {
    await page.goto(`/productos/${JEAN.id}`);
    const antes = await unidadesDeTalla(page, '28-8');
    await registrarMovimiento(page, { tipo: 'Ingreso', talla: '28-8', cantidad: 5, motivo: 'Compra a proveedor' });
    await expect(aviso(page)).toHaveText(`Ingreso registrado. Talla 28-8: quedan ${antes + 5} unidades.`);

    await page.reload();
    expect(await unidadesDeTalla(page, '28-8')).toBe(antes + 5);

    await page.goto(`/movimientos?productoId=${JEAN.id}`);
    const fila = page.locator('.tabla-movimientos tbody tr').first();
    await expect(fila).toContainText('Ingreso');
    await expect(fila).toContainText('28-8');
    await expect(fila.locator('.col-cambio')).toHaveText('+5');
    await expect(fila.locator('.col-queda')).toHaveText(String(antes + 5));
    await expect(fila).toContainText('Compra a proveedor');
  });

  test('no deja despachar más de lo que hay y un despacho válido resta', async ({ page }) => {
    await page.goto(`/productos/${JEAN.id}`);
    const antes = await unidadesDeTalla(page, '28-8');
    await page.getByRole('radio', { name: 'Despacho', exact: true }).check({ force: true });
    await page.getByRole('radio', { name: /^28-8 / }).check({ force: true });
    await page.getByLabel('Cantidad').fill(String(antes + 1));
    await expect(page.locator('#vista-previa')).toHaveText(`Solo quedan ${antes} unidades en talla 28-8.`);
    await expect(page.getByRole('button', { name: /^Registrar despacho/ })).toBeDisabled();

    await registrarMovimiento(page, { tipo: 'Despacho', talla: '28-8', cantidad: 2, motivo: 'Venta en tienda' });
    await expect(aviso(page)).toHaveText(`Despacho registrado. Talla 28-8: quedan ${antes - 2} unidades.`);
  });

  test('una devolución dañada queda registrada sin volver a la venta', async ({ page }) => {
    await page.goto(`/productos/${JEAN.id}`);
    const antes = await unidadesDeTalla(page, '28-8');
    await registrarMovimiento(page, {
      tipo: 'Devolución',
      condicion: 'Dañada',
      talla: '28-8',
      cantidad: 1,
      motivo: 'Costura rota',
    });
    await expect(aviso(page)).toContainText('Prenda dañada: no vuelve a la venta.');
    await page.reload();
    expect(await unidadesDeTalla(page, '28-8')).toBe(antes);
    const fila = page.locator('.tabla-movimientos tbody tr').first();
    await expect(fila).toContainText('Dañada');
    await expect(fila.locator('.col-cambio')).toHaveText('0');
  });

  test('avisa cuando una talla queda con stock bajo', async ({ page }) => {
    await page.goto(`/productos/${GORRA.id}`);
    const antes = await unidadesDeTalla(page, GORRA.talla);
    if (antes === 0) {
      await registrarMovimiento(page, { tipo: 'Ingreso', cantidad: 1, motivo: 'Compra a proveedor' });
      await expect(aviso(page)).toContainText('Ingreso registrado.');
      await page.reload();
    }
    const stock = await unidadesDeTalla(page, GORRA.talla);
    const minimo = page.getByLabel(`Mínimo para la talla ${GORRA.talla}`);
    if ((await minimo.inputValue()) !== String(stock)) {
      await minimo.fill(String(stock));
      await page.getByRole('button', { name: 'Guardar' }).click();
    }
    await expect(page.locator('.tabla-tallas tbody tr').first()).toContainText('Stock bajo');

    await page.goto('/');
    await expect(page.locator('.alertas')).toContainText(GORRA.nombre);
  });

  test('en el celular el kárdex se ve como tarjetas', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/movimientos');
    await expect(page.locator('.tabla-movimientos thead')).toHaveCSS('position', 'absolute');
    await expect(page.locator('.tabla-movimientos tbody tr').first()).toHaveCSS('display', 'grid');
    const ancho = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(ancho).toBeLessThanOrEqual(0);
  });
});
