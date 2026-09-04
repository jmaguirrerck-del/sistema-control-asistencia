# Hotfix V1.13.1

Corrige el error de compilación TypeScript en `app/api/admin/employees/[id]/device/route.ts` donde la sesión administrativa podía ser inferida como `null`.

También mejora los type guards de sesión en `lib/auth.ts` para que TypeScript reconozca correctamente una sesión autenticada luego de validar el rol.

## Actualización
Subir el contenido de esta carpeta a la raíz del repositorio GitHub y confirmar el commit. Vercel hará un nuevo deployment automáticamente.
