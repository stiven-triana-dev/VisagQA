export const TIENDA = {
  url: process.env.TIENDA_URL ?? 'http://localhost:3210',
  admin: {
    usuario: process.env.TIENDA_ADMIN_USUARIO ?? 'admin_qa',
    clave: process.env.TIENDA_ADMIN_CLAVE ?? 'clave-admin-qa-2026',
  },
  whatsapp: '573000000000',
};

export const INVENTARIO = {
  url: process.env.STOCK_URL ?? 'http://localhost:3220',
  admin: {
    usuario: process.env.STOCK_ADMIN_USUARIO ?? 'admin_qa',
    clave: process.env.STOCK_ADMIN_CLAVE ?? 'clave-stock-qa-2026',
  },
};

export const SESION_INVENTARIO = 'reportes/.sesiones/inventario-admin.json';

export const EN_LINEA = {
  tienda: 'https://visagshop.onrender.com',
  inventario: 'https://visagstock.onrender.com',
  unigest: process.env.UNIGEST_URL ?? 'https://unigest-d9zx.onrender.com',
  claveDemoUnigest: 'Demo-UniGest-2026',
};

export const JEAN = {
  id: 'p042',
  nombre: 'Jean baggy · Negro',
  precio: 130_000,
  tallas: ['24-4', '26-6', '28-8', '30-10', '32-12'],
};

export const GORRA = {
  id: 'p001',
  nombre: 'Gorra curva · Negra 01',
  precio: 45_000,
  talla: 'Ajustable',
};

export const CLAVE_VALIDA = 'Clave-Segura-2026';

export function correoUnico(prefijo = 'cliente'): string {
  return `${prefijo}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.test`;
}

export function pesos(valor: number): string {
  return `$ ${valor.toLocaleString('es-CO')}`;
}
