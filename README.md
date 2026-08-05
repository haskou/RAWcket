[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

# RAWcket

RAWcket es la base de un editor fotografico RAW no destructivo, local-first y ejecutado completamente en el navegador. Busca ofrecer una entrada sencilla y una profundidad progresiva sin copiar la interfaz ni la identidad de otros editores.

Esta primera iteracion construye el producto alrededor del futuro motor de revelado. El original nunca se modifica: cada cambio se registra como una operacion serializable dentro de una receta. **Todavia no hay revelado visual RAW/JPEG/PNG**; el editor muestra honestamente el original y los valores de la receta.

## Estado actual

Implementado:

- Aplicacion React + Vite + TypeScript strict, responsive y accesible.
- Biblioteca local con importacion JPEG/PNG, demo generada en Canvas, reapertura, renombrado, duplicado y borrado confirmado.
- Editor con modo Simple/Advanced, zoom de vista, paneles de producto y controles de prueba que modifican la receta sin fingir procesamiento.
- Modelo no destructivo: ajustes globales, curvas, transformacion de viewport y siete familias de mascaras.
- Operaciones comunes para humano e IA, validacion, serializacion, agrupacion de cambios, historial limitado, undo y redo.
- IndexedDB para proyecto/indice/configuracion y OPFS para originales con fallback IndexedDB.
- Autoguardado con debounce y guardado ante `visibilitychange`, `pagehide` y cierre explicito.
- Bundles `.rawcket` ZIP con `manifest.json`, `project.json`, original e integridad SHA-256.
- Migraciones versionadas con una migracion demostrativa `0 -> 1`.
- IA desactivada por defecto y vault opcional AES-GCM/PBKDF2 con contrasena maestra no almacenada.
- PWA opcional y app shell cacheada para uso offline despues de la primera carga.
- Unit, integracion y E2E; CI para lint, typecheck, tests, build y Chromium.

No implementado:

- Decodificacion RAW/ARW, demosaicing o pipeline de alta profundidad.
- Revelado visual por GPU/WASM/CPU, histograma, curvas interactivas o mascaras renderizadas.
- Segmentacion IA, asesor de revelado conectado o llamadas a proveedores.
- Exportacion fotografica final JPEG/PNG/TIFF. “Exportar” genera un bundle de proyecto portable.

El plan exhaustivo esta en [TODO.md](TODO.md).

## Ejecutar

Requisitos: Node.js 22+ y pnpm 10+.

```bash
pnpm install
pnpm dev
```

Tras instalar dependencias, `pnpm dev` es el unico comando necesario para arrancar RAWcket. Vite muestra la URL local.

## Calidad y build

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright install chromium   # solo la primera vez
pnpm test:e2e
```

`pnpm preview` sirve el build de produccion localmente.

## Arquitectura

RAWcket aplica DDD practico y arquitectura hexagonal en un unico contexto inicial, `projects`:

- `domain`: agregado `PhotoProject`, Value Objects, receta, operaciones, historial y contratos de repositorio. No importa React, IndexedDB, WebGPU, OpenAI ni APIs del navegador.
- `application`: casos de uso con mensajes explicitos y puertos para render, import/export y asesor IA.
- `infrastructure`: IndexedDB, OPFS, Zod, migraciones, bundles ZIP, hashing y cifrado.
- `presentation`: rutas, componentes, hooks de sesion/autoguardado y CSS.
- `app`: composition root declarativo que conecta contratos e implementaciones.

Detalles: [docs/architecture.md](docs/architecture.md) y [ADRs](docs/adr/).

## Almacenamiento local

Los proyectos, indices y preferencias viven en IndexedDB. Los originales JPEG/PNG se guardan en OPFS cuando esta disponible; en otros navegadores se usa un object store de IndexedDB. RAWcket solicita almacenamiento persistente, pero sigue funcionando si el navegador lo rechaza.

El navegador puede purgar datos por cuota, politica o accion del usuario. **El almacenamiento local no sustituye una copia de seguridad.** Exporta bundles `.rawcket` regularmente.

## Formato `.rawcket`

Un `.rawcket` es un ZIP que contiene:

```text
manifest.json    formato, versiones, tamanos y SHA-256
project.json     receta, metadata, historial y estado de UI versionados
original.jpg     o original.png
```

La importacion valida el manifest, la version, todos los hashes y el esquema Zod antes de hidratar el dominio. Si ya existe el id, se genera uno nuevo para evitar sobreescrituras.

## Privacidad y seguridad

- No existe backend, cuenta, autenticacion, analytics ni SaaS obligatorio.
- Ninguna imagen o metadata sale del dispositivo.
- La IA esta desactivada y el adaptador por defecto falla de forma explicita.
- Una API key puede vivir solo en memoria de sesion o cifrarse con AES-GCM; la clave de descifrado se deriva de una contrasena maestra que no se guarda.
- Las keys no forman parte del proyecto, bundles, logs ni errores.

Guardar secretos en un navegador compartido sigue teniendo riesgos. El modelo de amenaza y endurecimiento futuro se detalla en `TODO.md`.

## Estructura principal

```text
src/
  app/                         composition root
  contexts/projects/
    domain/                    modelo no destructivo y repositorios
    application/               casos de uso, mensajes y puertos
    infrastructure/            IndexedDB, OPFS, bundles, Zod, migraciones
  presentation/                React, rutas, componentes, hooks y estilos
  shared/infrastructure/       base de datos, settings, cifrado, storage
tests/
  unit/                        dominio e infraestructura
  integration/                 pantalla de biblioteca
  e2e/                         flujo persistente en Chromium
docs/adr/                      decisiones arquitectonicas
```

## Limitaciones conocidas

- Solo se importan JPEG y PNG; se visualiza el original sin aplicar la receta a pixeles.
- OPFS, persistencia solicitada y PWA dependen de capacidades del navegador y degradan de forma segura.
- `pagehide` no garantiza completar escrituras asincronas si el proceso termina abruptamente; el debounce reduce la ventana de perdida.
- El vault protege datos en reposo, no frente a XSS ejecutandose en el mismo origen.
- La experiencia prioriza escritorio, aunque biblioteca y editor no se rompen en tablet o movil.

## Contribuir

1. Crea una rama; no trabajes directamente en `main`.
2. Mantén comportamiento de dominio fuera de React e infraestructura.
3. Añade mensajes explicitos a nuevos entrypoints de aplicacion y pruebas directas para clases no triviales.
4. Ejecuta lint, typecheck, tests, build y el E2E relevante.
5. Usa commits convencionales con gitmoji, por ejemplo `feat(editor): ✨ Add curve interaction`.

## Licencia

MIT. Consulta [LICENSE](LICENSE).
