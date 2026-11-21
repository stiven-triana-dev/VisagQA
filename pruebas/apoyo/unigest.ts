import { expect, type Page } from '@playwright/test';
import { EN_LINEA } from './entorno';

export type Rol = 'Administración' | 'Docente' | 'Estudiante';

export function ventanaDeEntrada(page: Page) {
  return page.getByRole('dialog', { name: 'Bienvenido a UniGest' });
}

export async function abrirUnigest(page: Page): Promise<void> {
  await page.goto(`${EN_LINEA.unigest}/`);
  await expect(ventanaDeEntrada(page)).toBeVisible({ timeout: 120_000 });
}

export async function entrarComo(page: Page, rol: Rol): Promise<void> {
  await abrirUnigest(page);
  await ventanaDeEntrada(page).getByRole('button', { name: new RegExp(`^${rol}`) }).click();
  await expect(ventanaDeEntrada(page)).toBeHidden();
}

export async function pedirApi(page: Page, ruta: string): Promise<number> {
  return page.evaluate(async (r) => (await fetch(r, { headers: { Accept: 'application/json' } })).status, ruta);
}

export { expect };
