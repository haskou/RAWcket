# ADR 0004: Operaciones compartidas por humano e IA

- Estado: aceptada
- Fecha: 2026-08-05

## Contexto

Una IA no debe obtener una ruta privilegiada o mutar el estado fuera del historial.

## Decision

UI, presets, importacion futura e `EditingAdvisor` producen el mismo union serializable `EditOperation`. `PhotoProject` valida, aplica, calcula inversas, agrupa cambios continuos y limita historial.

## Consecuencias

Undo/redo, auditoria y validacion son uniformes. Los adapters IA solo proponen operaciones; el usuario decide que aplicar. Cambiar el contrato exige migracion y tests de compatibilidad.
