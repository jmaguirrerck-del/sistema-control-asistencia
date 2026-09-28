# V1.27.3 — Corrección integral de tipado de sesión

Esta versión corrige de forma transversal los errores de compilación TypeScript relacionados con sesiones administrativas potencialmente nulas.

## Cambios
- Los chequeos de permisos (`isAdmin`, `hasPermission`, `canManage...`) vuelven a ser booleanos simples y no type guards incorrectos.
- Todas las rutas que requieren sesión comprueban explícitamente que la sesión exista antes de acceder a `email`, `officeId` u otros campos.
- Se corrigieron en forma preventiva `settings`, `users`, `offices`, `records` y todas las rutas que dependen de permisos.
- El layout administrativo usa una referencia no nula explícita después de la redirección de login.
- Se mantienen multi-oficina, Reportes y todas las funciones de V1.27.

## Despliegue
Subir el contenido completo de este paquete a la raíz del repositorio y hacer commit. Vercel debe detectar `1.27.3` y ejecutar `npm run build`.
