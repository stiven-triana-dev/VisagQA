import { defineConfig, devices } from '@playwright/test';
import { TIENDA } from './pruebas/apoyo/entorno';

const carpetaTienda = process.env.TIENDA_DIR;

export default defineConfig({
  testDir: './pruebas',
  outputDir: './reportes/resultados',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  expect: { timeout: 8_000 },
  reporter: [['list'], ['html', { outputFolder: 'reportes/html', open: 'never' }]],
  use: {
    locale: 'es-CO',
    timezoneId: 'America/Bogota',
    screenshot: 'on',
    video: 'on',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'tienda',
      testDir: './pruebas/tienda',
      use: { ...devices['Desktop Chrome'], baseURL: TIENDA.url },
    },
  ],
  webServer: carpetaTienda
    ? {
        command: 'node app.js',
        cwd: carpetaTienda,
        url: `${TIENDA.url}/`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          DATABASE_URL: process.env.TIENDA_DATABASE_URL ?? '',
          ADMIN_USERNAME: TIENDA.admin.usuario,
          ADMIN_PASSWORD: TIENDA.admin.clave,
          WHATSAPP_NUMBER: TIENDA.whatsapp,
          PORT: new URL(TIENDA.url).port,
        },
      }
    : undefined,
});
