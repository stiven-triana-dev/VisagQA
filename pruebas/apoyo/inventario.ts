import { expect, type Page } from '@playwright/test';

export async function entrarInventario(page: Page, usuario: string, clave: string): Promise<void> {
  await page.goto('/');
  await page.getByLabel('Usuario').fill(usuario);
  await page.getByLabel('Contraseña').fill(clave);
  await page.getByRole('button', { name: 'Entrar ↗', exact: true }).click();
}

export async function unidadesDeTalla(page: Page, talla: string): Promise<number> {
  const fila = page.locator('.tabla-tallas tbody tr').filter({ has: page.getByRole('rowheader', { name: talla, exact: true }) });
  return Number(await fila.locator('.col-unidades').innerText());
}

export async function registrarMovimiento(
  page: Page,
  datos: { tipo: string; talla?: string; cantidad: number; motivo: string; condicion?: string },
): Promise<void> {
  await page.getByRole('radio', { name: datos.tipo, exact: true }).check({ force: true });
  if (datos.condicion) await page.getByRole('radio', { name: datos.condicion, exact: true }).check({ force: true });
  if (datos.talla) await page.getByRole('radio', { name: new RegExp(`^${datos.talla} `) }).check({ force: true });
  await page.getByLabel(datos.tipo === 'Ajuste' ? 'Unidades contadas' : 'Cantidad').fill(String(datos.cantidad));
  await page.getByLabel('Motivo').fill(datos.motivo);
  await page.getByRole('button', { name: new RegExp(`^(Registrar|Probar) ${datos.tipo.toLowerCase()}`) }).click();
}

export function aviso(page: Page) {
  return page.locator('.formulario').getByRole('status').or(page.locator('.formulario').getByRole('alert')).first();
}

export { expect };
