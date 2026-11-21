import { JEAN } from '../apoyo/entorno';
import { expect, soloNumeros, test } from '../apoyo/tienda';

test.describe('Catálogo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#catalogo');
  });

  function tarjetas(page: import('@playwright/test').Page) {
    return page.locator('#catalogo article');
  }

  test('muestra los 108 productos de la tienda', async ({ page }) => {
    await expect(page.getByRole('status').filter({ hasText: 'productos encontrados' })).toHaveText(
      '108 productos encontrados',
    );
    await expect(tarjetas(page).first()).toBeVisible();
  });

  test('filtra por categoría y vuelve a mostrar todo', async ({ page }) => {
    await page.getByRole('button', { name: 'Gorras' }).click();
    await expect(page.getByRole('button', { name: 'Gorras' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('41 productos encontrados')).toBeVisible();
    await expect(tarjetas(page).filter({ hasNotText: 'Gorra' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Ver todo' }).click();
    await expect(page.getByText('108 productos encontrados')).toBeVisible();
  });

  test('busca sin importar tildes ni mayúsculas', async ({ page }) => {
    await page.getByRole('searchbox', { name: 'Buscar productos' }).fill('PANTALONETA ALGODON');
    await expect(page.getByText(/^[1-9]\d* productos? encontrados?$/)).toBeVisible();
    const nombres = await tarjetas(page).getByRole('heading', { level: 3 }).allInnerTexts();
    expect(nombres.length).toBeGreaterThan(0);
    for (const nombre of nombres) expect(nombre.toLowerCase()).toContain('algodón');
  });

  test('avisa cuando la búsqueda no encuentra nada', async ({ page }) => {
    await page.getByRole('searchbox', { name: 'Buscar productos' }).fill('zzz producto inexistente');
    await expect(page.getByText('0 productos encontrados')).toBeVisible();
    await expect(tarjetas(page)).toHaveCount(0);
  });

  test('ordena por precio de menor a mayor', async ({ page }) => {
    await page.getByRole('combobox', { name: 'Ordenar productos' }).selectOption({ label: 'Precio: menor a mayor' });
    const precios = (await tarjetas(page).locator('text=/^\\$/').allInnerTexts()).map(soloNumeros).slice(0, 30);
    expect(precios.length).toBeGreaterThan(5);
    expect(precios).toEqual([...precios].sort((a, b) => a - b));
  });

  test('abre el detalle de un producto con precio y tallas', async ({ page }) => {
    await page.goto(`/products/${JEAN.id}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(JEAN.nombre);
    await expect(page.getByText(/^\$\s?130\.000$/).first()).toBeVisible();
    const tallas = page.getByRole('group', { name: 'ELIGE TU TALLA' }).getByRole('radio');
    await expect(tallas).toHaveCount(JEAN.tallas.length);
    await expect(page).toHaveTitle(`${JEAN.nombre} · VisagShop`);
  });

  test('un producto que no existe muestra la página 404', async ({ page }) => {
    const respuesta = await page.goto('/products/p999');
    expect(respuesta?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('404');
  });

  test('los letreros del detalle están en español', async ({ page }) => {
    await page.goto(`/products/${JEAN.id}`);
    await expect(page.locator('main')).not.toContainText(/streetwear/i);
  });
});
