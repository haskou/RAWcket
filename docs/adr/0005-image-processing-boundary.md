# ADR 0005: Procesamiento de imagen detras de PreviewRenderer

- Estado: aceptada
- Fecha: 2026-08-05

## Contexto

LibRaw/WASM, WebGPU, WebGL2 y CPU tienen ciclos de vida, capacidades y fallos distintos. No deben contaminar dominio ni React.

## Decision

`PreviewRenderer` es el puerto de aplicacion para previews. La implementacion futura vivira en infraestructura y coordinara workers, resoluciones, cancelacion y fallbacks. El editor actual muestra el original y no usa filtros CSS para simular revelado.

## Consecuencias

El dominio permanece independiente y el renderer puede sustituirse. Habra que definir un contrato de progreso/cancelacion y tests visuales deterministas antes de conectar controles a pixeles.
