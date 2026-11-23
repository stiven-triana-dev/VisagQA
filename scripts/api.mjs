import { mkdirSync } from 'node:fs';
import newman from 'newman';

const CORRIDAS = {
  'en-linea': [
    { nombre: 'unigest', titulo: 'UniGest API (en línea)', entorno: 'en-linea' },
    { nombre: 'visagstock', titulo: 'VisagStock API como invitado (en línea)', entorno: 'en-linea', carpeta: 'Invitado en línea', reporte: 'visagstock-invitado' },
    { nombre: 'visagassist', titulo: 'VisagAssist API (en línea)', entorno: 'en-linea' },
  ],
  local: [
    { nombre: 'visagshop', titulo: 'VisagShop API (copia local)', entorno: 'local' },
    { nombre: 'visagstock', titulo: 'VisagStock API como administrador (copia local)', entorno: 'local', carpeta: 'Administrador local', reporte: 'visagstock-administrador' },
  ],
};

const grupo = process.argv[2] ?? 'todo';
const elegidas = grupo === 'todo' ? [...CORRIDAS['en-linea'], ...CORRIDAS.local] : CORRIDAS[grupo];
if (!elegidas) {
  console.error(`Grupo desconocido: ${grupo}. Usa en-linea, local o todo.`);
  process.exit(2);
}

mkdirSync('reportes/api', { recursive: true });

function correr({ nombre, titulo, entorno, carpeta, reporte = nombre }) {
  return new Promise((resolver, rechazar) => {
    newman.run(
      {
        collection: `postman/${nombre}.postman_collection.json`,
        environment: `postman/${entorno}.postman_environment.json`,
        folder: carpeta,
        timeoutRequest: 180_000,
        reporters: ['cli', 'htmlextra', 'junit'],
        reporter: {
          htmlextra: { export: `reportes/api/${reporte}.html`, title: titulo, browserTitle: titulo },
          junit: { export: `reportes/api/${reporte}.xml` },
        },
      },
      (error, resumen) => (error ? rechazar(error) : resolver({ titulo, resumen })),
    );
  });
}

let fallas = 0;
const tabla = [];
for (const corrida of elegidas) {
  const { titulo, resumen } = await correr(corrida);
  const { requests, assertions } = resumen.run.stats;
  fallas += assertions.failed + requests.failed;
  tabla.push({ colección: titulo, peticiones: requests.total, comprobaciones: assertions.total, fallidas: assertions.failed });
}

console.table(tabla);
console.log(fallas ? `\n${fallas} comprobaciones fallaron. Revisa reportes/api/*.html` : '\nTodas las comprobaciones pasaron.');
process.exit(fallas ? 1 : 0);
