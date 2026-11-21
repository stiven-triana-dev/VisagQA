import { test as base, expect, type Page } from '@playwright/test';

export interface DatosEntrega {
  nombre: string;
  apellidos: string;
  celular: string;
  direccion: string;
  ciudad: string;
  departamento: string;
}

export const ENTREGA: DatosEntrega = {
  nombre: 'Laura',
  apellidos: 'Pruebas QA',
  celular: '3001234567',
  direccion: 'Calle 12 # 12-57',
  ciudad: 'Lebrija',
  departamento: 'Santander',
};

interface WhatsApp {
  mensajes: string[];
  esperarMensaje: () => Promise<string>;
}

export const test = base.extend<{ whatsapp: WhatsApp }>({
  whatsapp: [
    async ({ context }, usar) => {
      const mensajes: string[] = [];
      await context.route(/wa\.me|whatsapp\.com/, (ruta) => {
        mensajes.push(decodeURIComponent(ruta.request().url()));
        return ruta.fulfill({ status: 200, contentType: 'text/plain', body: 'WhatsApp bloqueado durante las pruebas' });
      });
      await usar({
        mensajes,
        esperarMensaje: async () => {
          await expect.poll(() => mensajes.length, { message: 'se esperaba que se abriera WhatsApp' }).toBeGreaterThan(0);
          return mensajes.at(-1) ?? '';
        },
      });
    },
    { auto: true },
  ],
});

export { expect };

export async function agregarAlCarrito(page: Page, id: string, talla: string): Promise<void> {
  await page.goto(`/products/${id}`);
  await page.getByRole('radio', { name: talla, exact: true }).check({ force: true });
  await page.getByRole('button', { name: /AÑADIR AL CARRITO/ }).click();
  await expect(page.getByText('Producto añadido').first()).toBeVisible();
}

export async function llenarEntrega(page: Page, datos: DatosEntrega = ENTREGA): Promise<void> {
  await page.getByRole('textbox', { name: 'Nombre *' }).fill(datos.nombre);
  await page.getByRole('textbox', { name: 'Apellidos *' }).fill(datos.apellidos);
  await page.getByRole('textbox', { name: 'Número de celular *' }).fill(datos.celular);
  await page.getByRole('textbox', { name: 'Dirección de entrega *' }).fill(datos.direccion);
  await page.getByRole('textbox', { name: 'Ciudad / municipio *' }).fill(datos.ciudad);
  await page.getByRole('combobox', { name: 'Departamento *' }).selectOption(datos.departamento);
}

export function confirmarPedido(page: Page) {
  return page.getByRole('button', { name: 'CONFIRMAR PEDIDO POR WHATSAPP' });
}

export function resumen(page: Page) {
  return page.getByRole('complementary', { name: /Resumen del pedido/ });
}

export function soloNumeros(texto: string): number {
  return Number(texto.replace(/\D/g, ''));
}
