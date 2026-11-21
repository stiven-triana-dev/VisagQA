# VisagQA

Pruebas automáticas **de punta a punta** para mis proyectos: **VisagShop** (la tienda), y en las
siguientes etapas **VisagStock**, **UniGest** y **VisagAssist**.

Cada proyecto ya tiene pruebas por dentro (unitarias y de integración). Lo que faltaba era probarlos
**desde afuera, como los usa una persona**: abrir la página, buscar, elegir talla, llenar el formulario,
iniciar sesión. Eso es lo que hace este repositorio, con Playwright, como lo haría un analista QA.

## Estado

| Etapa | Qué cubre | Estado |
| --- | --- | --- |
| 1 | VisagShop en el navegador: catálogo, carrito, pedido, cuentas y panel | ✅ 26 pruebas (2 encontraron errores reales) |
| 2 | UniGest (tres roles) y VisagStock (invitado) | Próximamente |
| 3 | APIs con Postman / Newman | Próximamente |
| 4 | GitHub Actions, prueba diaria en línea y reportes | Próximamente |

## Qué se prueba en VisagShop

Las pruebas corren contra **una copia de la tienda con una base de datos de prueba**, nunca contra la
tienda publicada: así se pueden hacer pedidos completos sin llenar la tienda real de pedidos falsos, y
cada ejecución empieza siempre desde los mismos datos.

| Archivo | Pruebas |
| --- | --- |
| `catalogo.spec.ts` | Los 108 productos, filtro por categoría, búsqueda sin tildes ni mayúsculas, búsqueda sin resultados, orden por precio, detalle con precio y tallas, página 404, letreros en español. |
| `carrito.spec.ts` | No deja añadir sin talla, contador, suma de cantidades y total, eliminar, el carrito se conserva al recargar. |
| `pedido.spec.ts` | Carrito vacío no se puede confirmar, campos obligatorios, **pedido completo** con el mensaje de WhatsApp, el servidor **ignora un precio falso**, rechaza tallas que no existen y cantidades fuera de 1 a 99. |
| `cuentas.spec.ts` | Perfil sin sesión, contraseña débil, registro, correo repetido, iniciar y cerrar sesión, que el inicio de sesión **no revele qué correos existen**, el pedido aparece en "Tus pedidos". |
| `administracion.spec.ts` | El panel pide usuario y contraseña; el pedido aparece en el panel y se le cambia el estado. |

WhatsApp **siempre queda bloqueado**: la prueba lee el mensaje que se iba a enviar (número de pedido,
prenda, talla, datos y total) pero no sale nada.

Cada prueba guarda **una captura y un video**, y si falla, también la traza paso a paso.

## Errores reales que encontraron las pruebas

| Hallazgo | Por qué importa | Prueba |
| --- | --- | --- |
| El detalle de cada producto dice **"VISAGSHOP / STREETWEAR COLLECTION"**. | En el Sprint 7 se decidió usar "ropa urbana" en vez de "streetwear"; este letrero se escapó. | `los letreros del detalle están en español` |
| Al iniciar sesión, la tienda responde **"No hay una cuenta registrada con este correo"** o **"La contraseña no es correcta"** según el caso. | Con esos dos mensajes alguien puede averiguar qué correos tienen cuenta (enumeración de usuarios). Lo seguro es un mismo mensaje en los dos casos. | `no revela si un correo está registrado` |

Estas dos pruebas fallan a propósito hasta que se corrija VisagShop: una prueba de QA que falla por un
error real está haciendo su trabajo.

## Cómo correrlo

Necesitas **Node.js 22.12 o superior**, PostgreSQL y una copia de
[VisagShop](https://github.com/stiven-triana-dev/VisagShop).

```bash
npm install
npx playwright install chromium
```

Opción A, que Playwright arranque la tienda solo:

```bash
TIENDA_DIR=../VisagShop TIENDA_DATABASE_URL=postgres://usuario:clave@localhost:5432/visagqa npm run test:tienda
```

Opción B, si la tienda ya está corriendo en `http://localhost:3210` con `ADMIN_USERNAME=admin_qa`,
`ADMIN_PASSWORD=clave-admin-qa-2026` y `WHATSAPP_NUMBER=573000000000`:

```bash
npm run test:tienda
```

Otros comandos:

```bash
npm run reporte    # abre el reporte con capturas y videos
npm run typecheck  # revisa los tipos de TypeScript
```

Si la base de datos está vacía, la tienda crea las tablas y carga sus 108 productos al arrancar. Las
pruebas crean sus propios clientes con correos `@example.test`.

## Qué usé y por qué

| Herramienta | Para qué | Por qué la elegí |
| --- | --- | --- |
| **Playwright** | Abrir un navegador real y usar la tienda como una persona | Espera sola a que aparezcan los elementos, graba video y captura, y deja una traza para ver qué pasó cuando algo falla. |
| **TypeScript** | Escribir las pruebas | Avisa errores antes de correr: un nombre mal escrito en una función de apoyo no llega a ejecutarse. |
| **Selectores por rol y nombre** (`getByRole`) | Encontrar botones y campos | Buscan los elementos como los anuncia un lector de pantalla ("botón AÑADIR AL CARRITO"), no por clases de CSS que cambian con el diseño. Si la página no es accesible, la prueba lo nota. |
| **Fixture propio de WhatsApp** | Bloquear los enlaces a `wa.me` en todas las pruebas | Ninguna prueba puede enviar un mensaje real por accidente, y todas pueden leer lo que se iba a enviar. |
| **PostgreSQL de prueba** | La base de la copia de la tienda | Es el mismo motor que usa la tienda en producción (Neon); un archivo JSON no se comportaría igual. |

## Lo que aprendí

1. **Primero entender, después probar.** Antes de escribir una sola prueba recorrí la tienda a mano con
   Playwright y miré qué envía al servidor. Así descubrí que el precio no viaja desde el navegador (solo el
   producto, la talla y la cantidad), y que la forma correcta de probar la seguridad era mandarle al
   servidor un pedido con un precio falso.
2. **No probar en producción lo que escribe datos.** Un pedido de prueba en la tienda real se ve como un
   pedido real. Por eso las pruebas completas van contra una copia, y lo que va en línea solo lee.
3. **Una prueba que pasa por error es peor que una que falla.** Mi prueba de "no revelar correos" pasó la
   primera vez: leía el mensaje antes de que apareciera y comparaba dos textos vacíos. Ahora espera a que
   el mensaje esté en pantalla, y falla como debe.
4. **Los límites de seguridad también afectan a las pruebas.** La tienda permite 10 pedidos y 5 registros
   por hora desde la misma conexión. Diseñé las pruebas para gastar pocos (una sola cuenta compartida, solo
   los pedidos necesarios).
5. **Las pruebas también encuentran errores de texto y de seguridad**, no solo de lógica: los dos hallazgos
   de esta etapa no rompían nada, pero uno contradice una decisión del proyecto y el otro filtra
   información.

## Problemas que tuve y cómo los resolví

| Problema | Por qué pasaba | Cómo lo resolví |
| --- | --- | --- |
| Varias pruebas fallaban con *strict mode violation* al añadir al carrito. | El aviso "Producto añadido" aparece dos veces en la página (en el detalle y flotante). | La prueba espera el primero de los dos; no es un error de la tienda. |
| No podía elegir el departamento por su etiqueta. | Hay dos campos con la etiqueta "Departamento": el de entrega y el de facturación (oculto). | Lo busco por su rol: la lista desplegable (`combobox`) "Departamento *". |
| Al confirmar el pedido se abría una pestaña de WhatsApp. | El botón abre `wa.me` con el resumen del pedido. | Un *fixture* bloquea `wa.me` en todas las pruebas y guarda el mensaje para revisarlo. |
| Después de explorar, las pruebas empezaron a fallar con "Demasiados intentos". | Mis exploraciones gastaron el límite de 10 pedidos por hora de la tienda de prueba. | Reiniciar la tienda (el límite vive en memoria) y gastar menos pedidos por ejecución. |
| La prueba de enumeración de correos pasaba sin deber. | Leía el aviso antes de que la respuesta del servidor lo llenara. | Esperar con `expect(...).not.toBeEmpty()` antes de leerlo. |
| TypeScript pedía la extensión `.js` en cada `import`. | Con `moduleResolution: nodenext` los `import` relativos deben llevarla. | Usar `moduleResolution: bundler`, que es como Playwright carga los archivos. |
