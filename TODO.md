# Roadmap de producto de RAWcket

Este documento solo contiene funcionalidades de producto pendientes. La configuracion, arquitectura base, CI, persistencia inicial, bundles, cifrado, documentacion y pruebas de esta iteracion ya estan resueltas.

## Orden recomendado inmediato

1. Prototipo LibRaw/WASM en worker con Sony A6600 ARW y extraccion de preview.
2. Contrato versionado de `PreviewRenderer` con progreso, cancelacion y niveles de resolucion.
3. Pipeline sRGB CPU/WASM de referencia y suite de imagenes doradas.
4. Renderer WebGPU para exposicion/contraste y fallback WebGL2.
5. Editor de curvas RGB interactivo con LUT y actualizacion de preview.

---

## 1. Motor RAW y formatos de entrada

**Objetivo.** Convertir un original de camara en una imagen lineal de alta profundidad, reproducible y preparada para el pipeline, empezando por Sony ARW de la A6600.

**Alcance.** Evaluar wrappers existentes de LibRaw frente a build propio; compilar LibRaw a WebAssembly; abrir ARW A6600; extraer preview embebida y EXIF; leer balance de blancos de camara, black/white levels y patron Bayer; implementar demosaicing y salida lineal de alta profundidad. Preparar JPEG/PNG/TIFF adicionales y una arquitectura de codecs extensible para otros RAW. Ejecutar en Web Worker con progreso y cancelacion, limites explicitos y gestion cuidadosa de memoria WASM.

**Dependencias.** Contrato ampliado de `PreviewRenderer`; toolchain Emscripten; fixtures RAW redistribuibles; worker protocol; politica de memoria/cache; investigacion de licencias de LibRaw y wrappers.

**Criterios de aceptacion.** Un ARW A6600 conocido abre sin bloquear el main thread; metadata y niveles coinciden con herramientas de referencia; la preview aparece antes del revelado completo; cancelar libera memoria; archivos corruptos producen errores legibles; tests dorados detectan regresiones; JPEG/PNG actuales siguen funcionando.

**Riesgos tecnicos.** Peso y tiempo de carga de WASM; picos de RAM; diferencias de color entre camaras; licencias/configuracion de codecs; Safari; ficheros maliciosos o truncados; copias WASM-JS costosas.

**Fases sugeridas.** (1) benchmark wrapper/build y preview embebida; (2) metadata A6600; (3) mosaico lineal + demosaic de referencia; (4) worker cancelable; (5) optimizacion memoria; (6) registro de codecs adicionales.

## 2. Pipeline GPU, color y previews

**Objetivo.** Aplicar la receta de manera interactiva sin sacrificar calidad ni bloquear la interfaz.

**Alcance.** WebGPU principal; fallback WebGL2; fallback CPU/WASM cuando sea razonable. Generar thumbnail de 512 px, preview interactiva de 2048–3072 px y full resolution solo al exportar. Diseñar shaders, LUTs de curvas de 1024 o 4096 entradas, color management sRGB inicial y futura compatibilidad Display P3. Añadir clipping warnings, histogramas RGB/luminancia, scopes opcionales, comparacion before/after, cache inteligente y render incremental.

**Dependencias.** Motor RAW lineal; capability detection; `PreviewRenderer`; worker protocol; fixtures de color; especificacion del orden de operaciones; cache versionada.

**Criterios de aceptacion.** La misma receta produce resultados visualmente equivalentes en GPU y referencia CPU dentro de tolerancia definida; el cambio de un ajuste actualiza la preview sin jank; el nivel de resolucion cambia sin saltos; histogramas y clipping reflejan el frame renderizado; la ausencia de WebGPU degrada con mensaje y fallback.

**Riesgos tecnicos.** Divergencia de shaders/controladores; precision de textura; gestion de perfiles ICC; limites de memoria GPU; device loss; coste de lectura GPU para histogramas; P3 inconsistente.

**Fases sugeridas.** (1) pipeline CPU de referencia; (2) WebGPU exposicion + contraste; (3) niveles de preview/cache; (4) WebGL2; (5) LUTs y color; (6) histogramas/scopes/before-after; (7) render incremental.

## 3. Herramientas globales de revelado

**Objetivo.** Conectar los ajustes ya modelados a un pipeline fotografico predecible, educativo y reversible.

**Alcance.** Exposicion, temperatura, tint, contraste, luces, sombras, blancos, negros, saturacion, vibrance, claridad, texture, dehaze, sharpen y reduccion de ruido. Añadir viñeta, correcciones opticas, aberracion cromatica, distorsion y perfiles de lente. Incorporar presets, copy/paste recipe y base para edicion por lotes futura.

**Dependencias.** Pipeline GPU/CPU; metadata y perfiles de camara/lente; orden documentado de etapas; nuevas operaciones y migracion de schema para texture, viñeta y optica.

**Criterios de aceptacion.** Cada control cambia pixeles y receta de forma equivalente; reset es identidad; undo/redo no deriva; rangos tienen unidad/documentacion; presets son operaciones auditables; copiar/pegar no copia ids o caches; correcciones opticas se pueden desactivar.

**Riesgos tecnicos.** Algoritmos con nombres iguales pero resultados distintos; halos/ruido; orden de operaciones; rendimiento de denoise/sharpen; base de datos de lentes/licencia; presets destructivos.

**Fases sugeridas.** (1) luz/color basicos; (2) claridad/texture/dehaze; (3) sharpen/denoise; (4) viñeta; (5) optica/perfiles; (6) presets y copy/paste; (7) batch como contexto separado.

## 4. Curvas (prioridad alta)

**Objetivo.** Ofrecer edicion tonal precisa con una interaccion fluida y matematicamente estable.

**Alcance.** Curva RGB maestra editable; R/G/B independientes; luminancia; histograma de fondo; puntos arrastrables; añadir/eliminar puntos; interpolacion monotonic-cubic y linear; LUT de 1024 o 4096 entradas; actualizacion interactiva; clipping; presets; reset por canal; copiar/pegar; edicion numerica avanzada; curvas locales en mascaras; documentacion educativa de cada canal.

**Dependencias.** LUTs del pipeline; histograma; modelo `ToneCurve` actual; agrupacion de operaciones continuas; accesibilidad de grafica; schema para curvas locales.

**Criterios de aceptacion.** Nunca se cruzan/duplican x; teclado y touch pueden mover puntos; un drag genera una sola accion; monotonic-cubic no crea overshoot; LUT coincide con evaluador CPU; reset y copy/paste preservan canal; clipping es visible sin depender solo del color.

**Riesgos tecnicos.** Overshoot/banding; precision a 8/16 bit; accesibilidad de canvas; rendimiento al arrastrar; puntos densos; diferencias entre LUTs.

**Fases sugeridas.** (1) evaluador + LUT dorada; (2) editor RGB lineal; (3) monotonic-cubic; (4) canales e histograma; (5) presets/numerica; (6) curvas locales y contenido educativo.

## 5. Recorte, encuadre y geometria

**Objetivo.** Reencuadrar sin alterar fisicamente el original hasta la exportacion.

**Alcance.** Marco fijo; mover libremente la imagen debajo; zoom; rotacion y enderezado; aspect ratios; flip; perspectiva, verticales y horizontales; overlays de composicion (regla de tercios y golden ratio); re-edicion posterior; rasterizar geometria solo en exportacion.

**Dependencias.** `ViewportTransform`; renderer; gestos pointer/touch/trackpad; matematica de homografia para perspectiva; metadata de orientacion EXIF.

**Criterios de aceptacion.** No se pierden pixeles al recortar; reset reproduce el encuadre inicial; marco e imagen se manipulan con teclado/touch; el viewport persistido reabre igual; export final coincide con preview; ratios bloqueados no deforman.

**Riesgos tecnicos.** Coordenadas tras rotacion/flip; huecos al enderezar; precision de transformacion; gestos conflictivos; homografias degeneradas; EXIF orientation doble.

**Fases sugeridas.** (1) crop/translate/scale; (2) rotacion/enderezado/flip; (3) ratios/overlays; (4) perspectiva; (5) raster final y tests geometricos.

## 6. Mascaras manuales

**Objetivo.** Aplicar ajustes locales precisos con fuentes vectoriales editables y caches regenerables.

**Alcance.** Pincel y eraser; tamaño, hardness, flow y pressure; gradiente lineal/radial; rango de luminancia/color; feather, density, expand/contract, invert y overlay. Ajustes y curvas locales; booleanas add/subtract/intersect; almacenamiento vectorial, cache rasterizada y render GPU.

**Dependencias.** `MaskDefinition`; pipeline local; Pointer Events y pressure; rasterizador GPU/CPU; schema/caches versionados; editor de curvas.

**Criterios de aceptacion.** Trazo vectorial reeditable; eraser no destruye el original; densidad/feather coinciden GPU/CPU; operaciones booleanas son deterministas; perder cache no pierde mascara; overlay accesible; grandes trazos no congelan UI.

**Riesgos tecnicos.** Volumen de puntos; suavizado y pressure por dispositivo; precision de bordes; explosiones de memoria; composicion anidada; migracion de cache.

**Fases sugeridas.** (1) rasterizador y overlay; (2) brush/eraser; (3) gradientes; (4) rangos; (5) locales/curvas; (6) booleanas y optimizacion.

## 7. Mascaras con IA local

**Objetivo.** Seleccionar por click sin enviar la imagen fuera del dispositivo.

**Alcance.** Click-to-mask; puntos positivos/negativos; bounding box; refinamiento iterativo. Evaluar SAM, SAM 2 o alternativa compatible sobre ONNX Runtime Web/WebGPU. Modelo bajo demanda en Cache Storage u OPFS; embedding una vez por preview y decoder rapido despues. Detectar capacidades; modelos ligero/avanzado; progreso, cancelacion y consentimiento; offline tras descarga; fallback manual.

**Dependencias.** Mascaras manuales; preview normalizada; ONNX Runtime Web; gestor de modelos/cache/cuota; worker pool; UX de consentimiento.

**Criterios de aceptacion.** Nada se descarga sin consentimiento; cancelar detiene red/computo; embedding se reutiliza por hash de preview/modelo; el proyecto conserva prompt/puntos/cajas/modelo/version, no depende del raster; funciona offline tras descargar; dispositivo no compatible ofrece herramientas manuales.

**Riesgos tecnicos.** Modelos grandes; RAM/VRAM; soporte WebGPU; calentamiento lento; calidad variable; supply chain de pesos; cuotas y modelos obsoletos.

**Fases sugeridas.** (1) benchmark modelos; (2) descarga/cache; (3) encoder worker; (4) decoder interactivo; (5) variantes/capabilities; (6) refinamiento y fallback.

## 8. Segmentacion semantica

**Objetivo.** Crear mascaras locales por categorias fotografias comunes.

**Alcance.** Sujeto, cielo, agua, vegetacion, personas, fondo, edificios, piel, pelo y ropa; modelo local; confianza; refinado manual; combinar categorias.

**Dependencias.** Infraestructura IA local; dataset/evaluacion; taxonomia versionada; mascaras booleanas; overlay/refinamiento.

**Criterios de aceptacion.** Categorias disponibles dependen del modelo declarado; confianza visible; resultados refinables; categorias se combinan como operaciones; version/modelo persisten; ausencia de categoria no se representa como certeza.

**Riesgos tecnicos.** Sesgos; categorias ambiguas; piel/personas sensibles; modelos grandes; calidad en noche/concierto; falsa confianza.

**Fases sugeridas.** (1) sujeto/cielo/personas; (2) agua/vegetacion/edificios; (3) piel/pelo/ropa; (4) confianza/calibracion; (5) combinacion y evaluacion diversa.

## 9. Mascaras por lenguaje natural

**Objetivo.** Traducir intencion textual a regiones editables y verificables, no a una mascara generativa opaca.

**Alcance.** Campo “describe que quieres seleccionar”; ejemplo “selecciona el reflejo rojo en el agua”. Modelo cloud opcional y VLM local futuro para convertir intencion en cajas, puntos y exclusiones; SAM local produce la mascara precisa. Conservar prompt, regiones, modelo y version. Admitir “agua excepto personas”, “cielo excepto edificios”, “zonas rojas del agua”, “sombras del sujeto” y “luces calidas de la derecha”; booleanas, advertencia de incertidumbre y edicion posterior.

**Dependencias.** SAM local; segmentacion semantica; adapter de proveedor; consentimiento de red; Structured Outputs; parser de intencion; booleanas.

**Criterios de aceptacion.** Antes de enviar preview se muestra exactamente que saldra; respuesta se valida; toda salida se convierte a `EditOperation`; usuario puede inspeccionar/corregir regiones; incertidumbre se muestra; rechazar no muta nada; RAW completo nunca se envia.

**Riesgos tecnicos.** Ambiguedad espacial; prompt injection en metadata; coste/privacidad cloud; VLM inventando regiones; traduccion/idiomas; dependencia de proveedor.

**Fases sugeridas.** (1) gramatica local con categorias; (2) adapter cloud de cajas/puntos; (3) exclusiones/booleanas; (4) incertidumbre/refinado; (5) VLM local.

## 10. IA de revelado opcional

**Objetivo.** Proponer cambios explicables y limitados sin obtener autoridad directa sobre el proyecto.

**Alcance.** OpenAI como primer adapter y proveedores reemplazables; VLM local futuro. Enviar solo con consentimiento una preview reducida, EXIF elegido, histogramas, clipping, percentiles, ruido estimado, valores actuales e intencion. Structured Outputs/JSON Schema produce operaciones limitadas y validadas. UI para propuesta paso a paso, aplicar/rechazar cada cambio, “probar menos”, “explicame”, historial, coste y cancelacion. No enviar RAW completo ni registrar imagenes. Presets: noche urbana, retrato, concierto, paisaje, arquitectura, preservar ambiente y correccion tecnica neutra.

**Dependencias.** `EditingAdvisor`; pipeline de analisis; consentimiento; vault; adapter OpenAI; schemas de operacion; medicion de coste; red cancelable.

**Criterios de aceptacion.** Funciona sin key con advisor desactivado; cada llamada enumera datos/coste estimado; output invalido se rechaza; operaciones pasan por el agregado e historial; una propuesta no aplicada no cambia nada; keys/previews no aparecen en logs/errores/proyectos.

**Riesgos tecnicos.** Coste variable; alucinaciones; privacidad; Structured Outputs cambiante; prompt injection EXIF; dependencia de modelo; previews identificables.

**Fases sugeridas.** (1) contrato/proveedor fake; (2) analisis local; (3) OpenAI con consentimiento; (4) revision por operacion; (5) presets e historial; (6) providers y VLM local.

## 11. Tutor de revelado

**Objetivo.** Enseñar decisiones fotograficas sin sustituir el criterio del usuario.

**Alcance.** Explicar por que se propone cada cambio; detectar clipping, sombras demasiado levantadas, ruido e informacion irrecuperable; explicar curvas RGB y balance de blancos; mostrar consecuencias antes de aplicar. Modos guiado, copiloto y manual con observaciones; aprendizaje local y opcional de preferencias.

**Dependencias.** Histogramas/clipping/ruido; before-after; asesor; sistema de contenidos versionado; preferencias locales exportables/borrables.

**Criterios de aceptacion.** Explicaciones enlazan a mediciones visibles; el tutor distingue dato de sugerencia; se puede silenciar; aprender preferencias exige opt-in y queda local; borrar preferencias es completo; ningun consejo se aplica automaticamente.

**Riesgos tecnicos.** Consejos prescriptivos; falsos positivos; lenguaje demasiado tecnico; accesibilidad; perfil local sensible; sesgo estetico.

**Fases sugeridas.** (1) reglas deterministas de clipping; (2) contenido educativo; (3) modo guiado; (4) copiloto; (5) preferencias locales transparentes.

## 12. Exportacion fotografica final

**Objetivo.** Rasterizar original + receta a un archivo final de calidad y mantener export de proyecto separado.

**Alcance.** JPEG, PNG y TIFF; calidad, resolucion, resize, sharpening de salida, sRGB, metadata, opcion de eliminar metadata, marca de agua, full resolution, progreso, cancelacion y worker.

**Dependencias.** Pipeline full-resolution; codecs; geometria; color management; EXIF writer; worker/memoria; File System Access API opcional.

**Criterios de aceptacion.** Preview de export y archivo coinciden dentro de tolerancia; cancelar no deja archivo parcial; metadata responde a opciones; full resolution no bloquea main; sharpening depende del tamaño final; extension/MIME/bytes concuerdan.

**Riesgos tecnicos.** Memoria extrema; limites de canvas; TIFF/16-bit; perfiles ICC; metadata privada; escritura parcial; artefactos al redimensionar.

**Fases sugeridas.** (1) JPEG sRGB worker; (2) PNG y resize; (3) metadata/privacy; (4) TIFF/alta profundidad; (5) sharpening/marca de agua; (6) escritura cancelable.

## 13. Gestion avanzada de proyectos

**Objetivo.** Hacer la biblioteca robusta ante cierres, cuotas, corrupcion y colecciones crecientes.

**Alcance.** Autosave robusto, snapshots, recuperacion inesperada, deteccion de corrupcion y copias de seguridad. Sidecars `.rawcket.json`, bundles y portabilidad entre navegadores. Vinculacion opcional al original con File System Access API y copia a OPFS por defecto. Gestion de cuotas, liberar espacio, archivos huerfanos, limpieza de caches, recientes, busqueda, tags, ratings y colecciones futuras.

**Dependencias.** Journal/transacciones; checksum por registro; API de cuota; cache catalog; search index; permisos de filesystem; migraciones.

**Criterios de aceptacion.** Un cierre durante save recupera ultimo snapshot consistente; corrupcion no sobrescribe backup; limpieza nunca elimina original referenciado; cuota se explica antes de fallar; sidecar/bundle importan con versiones; permisos revocados degradan a copia OPFS.

**Riesgos tecnicos.** `pagehide` limitado; transacciones entre IndexedDB/OPFS no atomicas; orphan races; permisos filesystem; sidecars desincronizados; indices grandes.

**Fases sugeridas.** (1) journal/snapshots; (2) integridad/recuperacion; (3) cuota/cache/orphans; (4) sidecars/File System Access; (5) busqueda/tags/ratings; (6) colecciones.

## 14. Seguridad y privacidad

**Objetivo.** Reducir el riesgo local y de integraciones opcionales con controles comprensibles.

**Alcance.** API key en memoria y cifrada con contrasena; AES-GCM y derivacion segura; borrado verificable. CSP, prevencion XSS, sin analytics por defecto, telemetria solo opt-in, auditoria de dependencias/supply chain, proteccion de previews enviadas a modelos, borrado explicito y transparencia de almacenamiento.

**Dependencias.** Hosting headers; Trusted Types; proceso de security review; SBOM/Dependabot; consentimiento y redaccion de metadata; vault actual.

**Criterios de aceptacion.** CSP estricta sin `unsafe-eval` en produccion; secretos no entran en estado serializable, logs ni telemetry; key eliminada no se recupera; preview cloud minimizada y consentida; telemetry off implica cero requests; auditoria de dependencias en CI.

**Riesgos tecnicos.** XSS derrota vault desbloqueado; extensiones del navegador; exfiltracion por dependencias; falsa sensacion de cifrado; cache HTTP; borrado fisico no garantizado por storage.

**Fases sugeridas.** (1) threat model/CSP; (2) hygiene de logs/red; (3) dependency audit/SBOM; (4) consentimientos cloud; (5) telemetry opt-in; (6) revision externa.

## 15. PWA y offline

**Objetivo.** Mantener la web util sin conexion y permitir instalacion sin exigirla.

**Alcance.** Service worker/app shell offline ya iniciados; añadir modelos IA descargables, actualizacion segura, aviso de nueva version, recuperacion si cambia schema e instalacion opcional nunca obligatoria.

**Dependencias.** Estrategia de version de assets; migraciones; gestor de modelos; UI de updates; pruebas offline multi-browser.

**Criterios de aceptacion.** Biblioteca abre offline despues de primera carga; update no activa codigo incompatible con datos sin migrar; usuario puede posponer; fallo de update recupera shell anterior; modelos indican tamaño y estado; web normal conserva todas las funciones.

**Riesgos tecnicos.** Cache obsoleta; service worker atascado; cuotas compartidas; migracion irreversible; modelo enorme; navegadores iOS.

**Fases sugeridas.** (1) tests de app shell; (2) UX de update; (3) rollback/schema handshake; (4) gestor de modelos; (5) install prompts no intrusivos.

## 16. Rendimiento y compatibilidad

**Objetivo.** Sostener interaccion fluida con archivos grandes en dispositivos heterogeneos.

**Alcance.** Worker pool, memoria WASM, tiled rendering, previews multinivel, OffscreenCanvas, ImageBitmap, cancelacion y main thread libre. Profiling; modos para poca RAM; Safari, Chrome y Firefox cuando WebGPU sea suficiente; fallbacks; limites explicitos de archivos grandes.

**Dependencias.** Motor/pipeline; scheduler; capability/memory estimation; telemetria local de rendimiento; matriz de dispositivos.

**Criterios de aceptacion.** Presupuesto de frame definido; tareas obsoletas se cancelan; memoria vuelve cerca de baseline al cerrar; tiles visibles priorizados; poca RAM reduce resolucion con aviso; limites se detectan antes de OOM; matriz CI/browser documentada.

**Riesgos tecnicos.** Falta de APIs de memoria fiables; OffscreenCanvas desigual; competencia workers; copias de buffers; thermal throttling; WebGPU inmaduro.

**Fases sugeridas.** (1) instrumentacion/performance budgets; (2) cancelacion/scheduler; (3) multi-resolution; (4) tiling/OffscreenCanvas; (5) low-memory; (6) matriz Safari/Chrome/Firefox.

## 17. Diseño, aprendizaje y accesibilidad

**Objetivo.** Mantener sencillez inicial y revelar potencia sin copiar Luminar Neo ni excluir teclado, touch o lectores de pantalla.

**Alcance.** Consolidar Simple/Advanced y progressive disclosure; atajos, historial visual, favoritos, paneles plegables, tooltips educativos, onboarding, empty states, procesamiento/errores legibles, accesibilidad, touch/trackpad, comparacion, overlays, vista de mascara e interfaz responsive. Priorizar pantalla grande sin romper movil/tablet.

**Dependencias.** Herramientas reales; sistema de comandos/atajos; design tokens; pruebas con usuarios; auditoria WCAG; before-after y overlays.

**Criterios de aceptacion.** Flujos principales completos por teclado; foco/labels/aria-live correctos; contraste WCAG AA; no depender solo de color; reduced motion respetado; touch targets adecuados; Simple no oculta estado aplicado; funciones pendientes nunca parecen activas.

**Riesgos tecnicos.** Densidad de herramientas; divergencia mobile/desktop; canvas inaccesible; atajos conflictivos; onboarding molesto; traduccion; imitacion involuntaria de referencias.

**Fases sugeridas.** (1) tokens/auditoria base; (2) atajos e historial; (3) tooltips/onboarding; (4) touch/trackpad; (5) canvas accesible; (6) tests de usuario y refinamiento responsive.

---

## Definition of Done para cualquier bloque

- Dominio y contratos versionados, sin primitivas invalidas ni acoplamiento a React/proveedor.
- Operaciones serializables, migracion y compatibilidad documentadas cuando cambie schema.
- Unit tests de clases no triviales, integracion del flujo y E2E de persistencia cuando aplique.
- Cancelacion, progreso, errores legibles, accesibilidad y privacidad incluidos en el alcance, no añadidos al final.
- README/ADRs/TODO actualizados; `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` y E2E relevante en verde.
