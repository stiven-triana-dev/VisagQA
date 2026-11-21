import { test } from '@playwright/test';
import { EN_LINEA } from '../apoyo/entorno';
import { abrirUnigest, entrarComo, expect, pedirApi, ventanaDeEntrada } from '../apoyo/unigest';

const RUTAS_DE_ADMINISTRACION = ['/api/v1/estudiantes', '/api/v1/docentes', '/api/v1/matriculas'];

test.describe('UniGest en línea (solo lectura)', () => {
  test('sin sesión, la API no entrega datos', async ({ request }) => {
    for (const ruta of RUTAS_DE_ADMINISTRACION) {
      const respuesta = await request.get(`${EN_LINEA.unigest}${ruta}`, { headers: { Accept: 'application/json' } });
      expect([401, 403], `${ruta} respondió ${respuesta.status()}`).toContain(respuesta.status());
    }
  });

  test('con una contraseña incorrecta no entra y lo explica', async ({ page }) => {
    await abrirUnigest(page);
    const ventana = ventanaDeEntrada(page);
    await ventana.getByRole('textbox', { name: 'Correo electrónico' }).fill('admin@demo.test');
    await ventana.getByRole('textbox', { name: 'Contraseña' }).fill('Clave-Equivocada-9');
    await ventana.getByRole('button', { name: 'Entrar', exact: true }).click();
    const mensaje = ventana.getByRole('alert').or(ventana.getByRole('status')).first();
    await expect(mensaje).not.toBeEmpty();
    await expect(ventana).toBeVisible();
    await expect(mensaje, 'el mensaje debe hablar del correo o la contraseña, no de una sesión vencida').toHaveText(
      /contraseña/i,
    );
  });

  test('el administrador ve el resumen y el directorio de estudiantes', async ({ page }) => {
    await entrarComo(page, 'Administración');
    await expect(page).toHaveURL(/\/panel\//);
    await expect(page.getByRole('banner')).toContainText('admin@demo.test');
    const estudiantes = page.locator('main article').filter({ hasText: 'Estudiantes registrados' }).locator('strong');
    await expect(estudiantes).toHaveText(/^\d+$/);
    expect(Number(await estudiantes.innerText())).toBeGreaterThan(0);

    await page.getByRole('button', { name: /Estudiantes$/ }).click();
    await expect(page.getByRole('heading', { name: 'Directorio de estudiantes' })).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: 'estudiante@demo.test' })).toBeVisible();
    expect(await pedirApi(page, '/api/v1/estudiantes')).toBe(200);
  });

  test('la pantalla de entrada no muestra textos del modo de desarrollo', async ({ page }) => {
    await page.goto(`${EN_LINEA.unigest}/`);
    await expect(page.locator('body')).not.toContainText(/servidor local|entorno local|localhost/i);
    await abrirUnigest(page);
    await expect(ventanaDeEntrada(page)).toContainText('Demo pública');
    await expect(page.locator('body')).not.toContainText(/servidor local|entorno local|localhost/i);
  });

  test('el logo se ve en la pantalla de entrada', async ({ page }) => {
    await abrirUnigest(page);
    const logo = ventanaDeEntrada(page).getByRole('img', { name: 'Logo UniGest' });
    await expect(logo).toBeVisible();
    await expect.poll(() => logo.evaluate((imagen: HTMLImageElement) => imagen.naturalWidth)).toBeGreaterThan(0);
  });

  test('el docente entra a su portal y no puede ver datos de administración', async ({ page }) => {
    await entrarComo(page, 'Docente');
    await expect(page).toHaveURL(/\/portal\//);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Mi espacio docente');
    await expect(page.getByRole('heading', { name: 'Grupos asignados' })).toBeVisible();
    for (const ruta of RUTAS_DE_ADMINISTRACION) expect(await pedirApi(page, ruta), ruta).toBe(403);

    await page.goto(`${EN_LINEA.unigest}/panel/index.html`);
    await expect(page).toHaveURL(/\/portal\//);
  });

  test('el estudiante ve su boletín y no puede ver datos de otros', async ({ page }) => {
    await entrarComo(page, 'Estudiante');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Mi espacio estudiantil');
    await expect(page.getByRole('heading', { name: 'Mi boletín académico' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: 'Bases de Datos' })).toBeVisible();
    for (const ruta of RUTAS_DE_ADMINISTRACION) expect(await pedirApi(page, ruta), ruta).toBe(403);

    await page.goto(`${EN_LINEA.unigest}/panel/index.html`);
    await expect(page).toHaveURL(/\/portal\//);
  });
});
