# ADR 0003: IndexedDB para estructura y OPFS para binarios

- Estado: aceptada
- Fecha: 2026-08-05

## Contexto

Los proyectos necesitan consultas e indices; los originales y futuras caches son blobs potencialmente grandes.

## Decision

IndexedDB guarda agregados serializados, indice y configuracion. `SourceFileRepository` usa OPFS cuando existe y un object store de IndexedDB como fallback. La aplicacion solicita persistencia sin asumir que sera concedida.

## Consecuencias

No existe dependencia de red. Hay que administrar cuotas, residuos y migraciones. El guardado ante cierre es best-effort y no reemplaza backups.
