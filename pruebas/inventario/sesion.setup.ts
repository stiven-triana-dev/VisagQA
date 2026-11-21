import { test as preparar } from '@playwright/test';
import { INVENTARIO, SESION_INVENTARIO } from '../apoyo/entorno';
import { entrarInventario, expect } from '../apoyo/inventario';

preparar('iniciar sesión como administrador del inventario', async ({ page }) => {
  await entrarInventario(page, INVENTARIO.admin.usuario, INVENTARIO.admin.clave);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Así está tu');
  await page.context().storageState({ path: SESION_INVENTARIO });
});
