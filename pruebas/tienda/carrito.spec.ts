import { GORRA, JEAN } from '../apoyo/entorno';
import { agregarAlCarrito, expect, resumen, soloNumeros, test } from '../apoyo/tienda';

test.describe('Carrito', () => {
  test('no deja añadir una prenda sin elegir talla', async ({ page }) => {
    await page.goto(`/products/${JEAN.id}`);
    await page.getByRole('button', { name: /AÑADIR AL CARRITO/ }).click();
    await expect(page.getByText('Selecciona una talla para continuar.')).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('visag_carrito'))).toBeNull();
  });

  test('añade una prenda con su talla y actualiza el contador', async ({ page }) => {
    await agregarAlCarrito(page, JEAN.id, '28-8');
    await expect(page.locator('[data-cart-count]')).toHaveText('1');

    await page.goto('/productCart');
    const prenda = resumen(page).getByRole('article').filter({ hasText: JEAN.nombre });
    await expect(prenda).toContainText('Talla 28-8');
    await expect(resumen(page)).toContainText('Subtotal (1 artículo)');
  });

  test('suma las cantidades y recalcula el total', async ({ page }) => {
    await agregarAlCarrito(page, JEAN.id, '30-10');
    await agregarAlCarrito(page, GORRA.id, GORRA.talla);
    await page.goto('/productCart');

    await page.getByRole('button', { name: `Añadir una unidad de ${JEAN.nombre}` }).click();
    const cantidad = resumen(page).getByRole('article').filter({ hasText: JEAN.nombre }).getByRole('status', { name: 'Cantidad' });
    await expect(cantidad).toHaveText('2');

    const esperado = JEAN.precio * 2 + GORRA.precio;
    await expect(resumen(page)).toContainText('Subtotal (3 artículos)');
    const total = await resumen(page).locator('strong').filter({ hasText: 'COP' }).innerText();
    expect(soloNumeros(total)).toBe(esperado);
  });

  test('eliminar la última prenda deja el carrito vacío', async ({ page }) => {
    await agregarAlCarrito(page, GORRA.id, GORRA.talla);
    await page.goto('/productCart');
    await page.getByRole('button', { name: `Eliminar ${GORRA.nombre}` }).click();
    await expect(resumen(page).getByRole('article')).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('visag_carrito'))).toBe('[]');
  });

  test('el carrito se conserva al recargar la página', async ({ page }) => {
    await agregarAlCarrito(page, JEAN.id, '24-4');
    await page.goto('/productCart');
    await page.reload();
    await expect(resumen(page).getByRole('article').filter({ hasText: JEAN.nombre })).toContainText('Talla 24-4');
  });
});
