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


## V1.27.3 — Corrección integral de compilación
Se corrigió de forma transversal el manejo de sesiones y permisos para evitar errores TypeScript de valores `null` y estrechamientos incorrectos a `never`.


## V1.27.4 — Corrección de tipado de asistencia
Se tipó explícitamente el contexto diario de asistencia para evitar inferencias `never` durante el build de Next.js/TypeScript.
