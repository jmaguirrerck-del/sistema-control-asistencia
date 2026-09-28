# V1.27.4 — Corrección de tipado del contexto de asistencia

Esta versión corrige de forma centralizada el error de compilación de TypeScript que podía hacer que `todayEmployeeContext()` se infiriera como `never` en rutas de marcación.

Cambios:
- Se agregó un tipo explícito `EmployeeDayContext` en `lib/attendance.ts`.
- `todayEmployeeContext()` ahora declara explícitamente `Promise<EmployeeDayContext>`.
- Esto estabiliza el tipado de `schedule`, `leave`, `attendance` y `lastEvent` en todas las rutas que usan el contexto diario, incluyendo `/api/mark/status` y `/api/mark/submit`.
- Se mantienen las correcciones anteriores de sesión/administración de V1.27.1–V1.27.3.

Versión de package.json: `1.27.4`.
