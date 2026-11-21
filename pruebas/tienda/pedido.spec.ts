import type { Page } from '@playwright/test';
import { GORRA, JEAN } from '../apoyo/entorno';
import { agregarAlCarrito, confirmarPedido, ENTREGA, expect, llenarEntrega, resumen, test } from '../apoyo/tienda';

async function enviarPedido(page: Page, items: unknown[], cambios: Record<string, unknown> = {}) {
  return page.evaluate(
    async ({ items, cambios, entrega }) => {
      const cuerpo = {
        email: '',
        pais: 'Colombia',
        nombre: entrega.nombre,
        apellidos: entrega.apellidos,
        documento: '',
        celular: entrega.celular,
        direccion: entrega.direccion,
        complemento: '',
        ciudad: entrega.ciudad,
        departamento: entrega.departamento,
        postal: '',
        'medio-pago': 'contraentrega',
        facturacion: 'misma',
        fact_direccion: '',
        fact_ciudad: '',
        fact_departamento: '',
        items,
        ...cambios,
      };
      const respuesta = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo),
      });
      return { estado: respuesta.status, datos: await respuesta.json() };
    },
    { items, cambios, entrega: ENTREGA },
  );
}

test.describe('Pedido', () => {
  test('con el carrito vacío no se puede confirmar', async ({ page }) => {
    await page.goto('/productCart');
    await expect(resumen(page)).toContainText('Tu carrito está vacío');
    await expect(confirmarPedido(page)).toBeDisabled();
  });

  test('no envía el pedido si faltan datos obligatorios', async ({ page }) => {
    await agregarAlCarrito(page, GORRA.id, GORRA.talla);
    await page.goto('/productCart');
    let envios = 0;
    page.on('request', (peticion) => {
      if (peticion.url().includes('/api/orders')) envios += 1;
    });
    await confirmarPedido(page).click();
    const nombre = page.getByRole('textbox', { name: 'Nombre *' });
    await expect(nombre).toBeFocused();
    expect(await nombre.evaluate((campo: HTMLInputElement) => campo.validity.valueMissing)).toBe(true);
    expect(envios).toBe(0);
  });

  test('un cliente sin cuenta hace un pedido completo y se abre WhatsApp con el resumen', async ({ page, whatsapp }) => {
    await agregarAlCarrito(page, JEAN.id, '28-8');
    await agregarAlCarrito(page, GORRA.id, GORRA.talla);
    await page.goto('/productCart');
    await llenarEntrega(page);

    const respuesta = page.waitForResponse((r) => r.url().endsWith('/api/orders') && r.request().method() === 'POST');
    await confirmarPedido(page).click();
    const pedido = await (await respuesta).json();
    expect((await respuesta).status()).toBe(201);
    expect(pedido.code).toMatch(/^VS-\d{4,}$/);
    expect(pedido.subtotal).toBe(JEAN.precio + GORRA.precio);

    const mensaje = await whatsapp.esperarMensaje();
    expect(mensaje).toContain(`wa.me/573000000000`);
    expect(mensaje).toContain(`Pedido N.º ${pedido.code}`);
    expect(mensaje).toContain(JEAN.nombre);
    expect(mensaje).toContain('Talla: 28-8');
    expect(mensaje).toContain(GORRA.nombre);
    expect(mensaje).toContain(`Nombre: ${ENTREGA.nombre} ${ENTREGA.apellidos}`);
    expect(mensaje).toMatch(/Total estimado: \$\s175\.000/);

    await expect.poll(() => page.evaluate(() => localStorage.getItem('visag_carrito'))).toBe('[]');
  });

  test('el servidor ignora un precio falso enviado desde el navegador', async ({ page }) => {
    await page.goto('/productCart');
    const { estado, datos } = await enviarPedido(page, [{ id: JEAN.id, talla: '28-8', cant: 1, precio: 1, price: 1 }]);
    expect(estado).toBe(201);
    expect(datos.subtotal).toBe(JEAN.precio);
  });

  test('el servidor rechaza tallas que no existen y cantidades fuera de rango', async ({ page }) => {
    await page.goto('/productCart');
    const talla = await enviarPedido(page, [{ id: JEAN.id, talla: 'XXL', cant: 1 }]);
    expect(talla.estado).toBe(400);
    expect(talla.datos.error).toBe(`La talla XXL no está disponible para ${JEAN.nombre}.`);

    const cantidad = await enviarPedido(page, [{ id: JEAN.id, talla: '28-8', cant: 100 }]);
    expect(cantidad.estado).toBe(400);
    expect(cantidad.datos.error).toBe('La cantidad de cada prenda debe estar entre 1 y 99.');
  });
});
