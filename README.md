## V1.27.2 — Corrección de compilación

Corrige el tipado de la sesión del Administrador General en el layout multi-oficina y mantiene la validación nula en tipos de licencia.

# Sistema de Control de Asistencia

## V1.27.1 — Corrección de compilación

Incluye todas las funciones de V1.27 (multi-oficina y Reportes) y corrige el tipado de sesión administrativa que impedía compilar en Vercel.

- Arquitectura multi-oficina / multi-Dirección.
- Administrador General y usuarios restringidos por oficina.
- Reportes generales e individuales de asistencia.
- Corrección de `leave-types/route.ts`.
- `isGeneralAdmin` e `isAdmin` actúan como type guards para evitar falsos errores de sesión nula en TypeScript.

Versión: **1.27.1**
