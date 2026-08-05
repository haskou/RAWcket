# ADR 0001: Aplicacion frontend-only y local-first

- Estado: aceptada
- Fecha: 2026-08-05

## Contexto

RAWcket debe funcionar sin cuentas, backend, API key o SaaS obligatorio y no enviar imagenes sin una accion explicita.

## Decision

La primera arquitectura es una SPA Vite/React. Proyecto, original, preferencias y secretos cifrados se conservan en almacenamiento del navegador. Una PWA cachea el app shell, pero instalarla es opcional.

## Consecuencias

Privacidad, offline y despliegue estatico son simples. Cuota, purga y portabilidad del almacenamiento pasan a ser riesgos de producto; los bundles `.rawcket` son el mecanismo de backup y transporte.
