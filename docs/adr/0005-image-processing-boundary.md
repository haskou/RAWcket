# ADR 0005: Procesamiento de imagen detras de PreviewRenderer

- Estado: aceptada
- Fecha: 2026-08-05

## Contexto

LibRaw/WASM, WebGPU, WebGL2 y CPU tienen ciclos de vida, capacidades y fallos distintos. No deben contaminar dominio ni React.

## Decision

`PreviewRenderer` es el puerto de aplicacion para previews. `WorkerPreviewRenderer` coordina resolucion, progreso, cancelacion, timeout y concurrencia con `@haskou/flow`; una referencia CPU aplica exposicion/contraste sobre pixeles reales. WebGPU/WebGL2 y el pipeline RAW se añadiran como adapters sin contaminar React o dominio.

## Consecuencias

El dominio permanece independiente y el renderer puede sustituirse. Habra que definir un contrato de progreso/cancelacion y tests visuales deterministas antes de conectar controles a pixeles.
