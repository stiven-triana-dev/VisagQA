import type { Page } from '@playwright/test';
import { CLAVE_VALIDA, correoUnico, GORRA } from '../apoyo/entorno';
import { agregarAlCarrito, confirmarPedido, expect, llenarEntrega, test } from '../apoyo/tienda';

const cliente = { nombre: 'Mario', apellido: 'Pruebas', correo: correoUnico('mario') };

async function registrar(page: Page, correo: string, clave: string) {
  await page.goto('/register');
  await page.getByRole('textbox', { name: 'Nombre' }).fill(cliente.nombre);
  await page.getByRole('textbox', { name: 'Apellido' }).fill(cliente.apellido);
  await page.getByRole('textbox', { name: 'Correo electrónico' }).fill(correo);
  await page.getByRole('textbox', { name: /^Contraseña/ }).fill(clave);
  await page.getByRole('textbox', { name: 'Confirmar contraseña' }).fill(clave);
  await page.getByRole('button', { name: /CREAR CUENTA/ }).click();
}

async function iniciarSesion(page: Page, correo: string, clave: string) {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Correo electrónico' }).fill(correo);
  await page.getByRole('textbox', { name: 'Contraseña' }).fill(clave);
  await page.getByRole('button', { name: /INICIAR SESIÓN/ }).click();
}

function avisoFormulario(page: Page) {
  return page.locator('main form').getByRole('status').first();
}

test.describe('Cuentas de clientes', () => {
  test.describe.configure({ mode: 'serial' });

  test('sin sesión, el perfil lleva a iniciar sesión', async ({ page }) => {
    await page.goto('/profile');
    await expect(page).toHaveURL(/\/login\?next=%2Fprofile$/);
  });

  test('rechaza una contraseña débil', async ({ page }) => {
    await registrar(page, correoUnico('debil'), 'abc12345');
    await expect(avisoFormulario(page)).toHaveText('Revisa los campos marcados.');
    await expect(page.getByRole('textbox', { name: /^Contraseña/ })).toHaveAttribute('aria-invalid', 'true');
    await expect(page).toHaveURL(/\/register$/);
  });

  test('registra una cuenta nueva y entra a su perfil', async ({ page }) => {
    await registrar(page, cliente.correo, CLAVE_VALIDA);
    await expect(page).toHaveURL(/\/profile$/);
    await expect(page.getByText(`${cliente.nombre} ${cliente.apellido}`)).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Correo electrónico' })).toHaveValue(cliente.correo);
    await expect(page.getByRole('link', { name: new RegExp(`Hola, ${cliente.nombre}`) })).toBeVisible();
  });

  test('no permite registrar dos veces el mismo correo', async ({ page }) => {
    await registrar(page, cliente.correo, CLAVE_VALIDA);
    await expect(avisoFormulario(page)).toHaveText('Ya existe una cuenta con este correo.');
    await expect(page.getByRole('textbox', { name: 'Correo electrónico' })).toHaveAttribute('aria-invalid', 'true');
  });

  test('inicia sesión y la cierra', async ({ page }) => {
    await iniciarSesion(page, cliente.correo, CLAVE_VALIDA);
    await expect(page).toHaveURL(/\/profile$/);
    await page.getByRole('button', { name: /CERRAR SESIÓN/ }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('link', { name: 'Mi cuenta' }).or(page.getByText('Ingresar')).first()).toBeVisible();
  });

  test('no revela si un correo está registrado', async ({ page }) => {
    await iniciarSesion(page, cliente.correo, 'Clave-Equivocada-1');
    await expect(avisoFormulario(page)).not.toBeEmpty();
    const conCuenta = await avisoFormulario(page).innerText();
    await iniciarSesion(page, correoUnico('nadie'), 'Clave-Equivocada-1');
    await expect(avisoFormulario(page)).not.toBeEmpty();
    const sinCuenta = await avisoFormulario(page).innerText();
    expect(conCuenta, 'el mensaje debe ser igual exista o no la cuenta').toBe(sinCuenta);
  });

  test('el pedido hecho con sesión aparece en "Tus pedidos"', async ({ page }) => {
    await iniciarSesion(page, cliente.correo, CLAVE_VALIDA);
    await expect(page).toHaveURL(/\/profile$/);
    await agregarAlCarrito(page, GORRA.id, GORRA.talla);
    await page.goto('/productCart');
    await llenarEntrega(page);
    const respuesta = page.waitForResponse((r) => r.url().endsWith('/api/orders'));
    await confirmarPedido(page).click();
    const pedido = await (await respuesta).json();
    expect(pedido.mine).toBe(true);

    await page.goto('/profile');
    const pedidos = page.getByRole('region', { name: 'Tus pedidos.' });
    await expect(pedidos).toContainText(pedido.code);
    await expect(pedidos).not.toContainText('Aún no tienes pedidos');
  });
});
