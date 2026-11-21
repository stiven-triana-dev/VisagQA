import { test } from '@playwright/test';
import { EN_LINEA, JEAN } from '../apoyo/entorno';
import { aviso, expect, registrarMovimiento, unidadesDeTalla } from '../apoyo/inventario';

test.describe('VisagStock en línea como invitado', () => {
  test.use({ baseURL: EN_LINEA.inventario });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Entrar como invitado/ }).click({ timeout: 180_000 });
    await expect(page.getByRole('status').filter({ hasText: 'Modo invitado' })).toBeVisible();
  });

  test('entra sin contraseña y ve los productos de la tienda', async ({ page }) => {
    await expect(page.getByRole('banner')).toContainText('invitado');
    await expect(page.locator('.cifra').filter({ hasText: 'Productos' }).locator('strong')).toHaveText('108');
    await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Productos' }).click();
    await page.getByPlaceholder('Buscar por nombre o categoría').fill('jean baggy negro');
    await expect(page.getByRole('link', { name: new RegExp(JEAN.nombre) }).first()).toBeVisible();
  });

  test('un ingreso de prueba muestra el resultado pero no cambia el stock', async ({ page }) => {
    await page.goto(`/productos/${JEAN.id}`);
    const antes = await unidadesDeTalla(page, '28-8');
    await registrarMovimiento(page, { tipo: 'Ingreso', talla: '28-8', cantidad: 3, motivo: 'Compra a proveedor' });
    await expect(aviso(page)).toHaveText(
      `Prueba correcta. Así quedaría la talla 28-8: ${antes + 3} unidades. Como invitado, no se guarda.`,
    );
    await page.reload();
    expect(await unidadesDeTalla(page, '28-8')).toBe(antes);
  });

  test('tampoco deja simular un despacho mayor al stock', async ({ page }) => {
    await page.goto(`/productos/${JEAN.id}`);
    const antes = await unidadesDeTalla(page, '28-8');
    await page.getByRole('radio', { name: 'Despacho', exact: true }).check({ force: true });
    await page.getByRole('radio', { name: /^28-8 / }).check({ force: true });
    await page.getByLabel('Cantidad').fill(String(antes + 1));
    await expect(page.getByRole('button', { name: /^Probar despacho/ })).toBeDisabled();
  });
});
