# V1.27.2 — Corrección de compilación

Esta versión corrige el error TypeScript `Property officeName does not exist on type never` del layout administrativo.

También conserva la corrección anterior de `leave-types/route.ts` para validar explícitamente una sesión nula antes de usar `s.email`.

## Despliegue

Subir el contenido completo de esta versión al repositorio y realizar commit. Vercel debe ejecutar `npm run build`.
