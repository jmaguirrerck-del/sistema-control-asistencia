# Actualización V1.28.0 — Generador de QR protegido

## Cambios principales
- Se elimina la generación pública del QR desde la portada.
- La portada ahora redirige al acceso administrativo.
- Nuevo permiso asignable: `QR_GENERATOR` — **Generador de QR**.
- El Administrador General puede asignar ese permiso a un usuario de oficina.
- Un usuario con solo `QR_GENERATOR` ingresa directamente a `/admin/qr` y no obtiene permisos de Asistencia, Personal, Legajos o Licencias.
- `/admin/qr` valida sesión y permiso del lado del servidor.
- `/api/admin/qr` valida también el permiso del lado del servidor.
- `/api/qr/public` queda deshabilitado.
- El QR tiene vigencia fija de **3 minutos** y la pantalla lo renueva automáticamente cada 3 minutos.
- El QR generado para un usuario de oficina corresponde únicamente a su oficina. El Administrador General puede seleccionar oficina.

## Despliegue
Subir el contenido completo del proyecto a GitHub. Vercel ejecutará la migración al primer uso de una ruta que invoque `ensureV13Schema()`. La migración incorpora el permiso `QR_GENERATOR` al catálogo y fija `qr_ttl_minutes=3` para las oficinas existentes.

## Después de desplegar
1. Ingresar como Administrador General.
2. Ir a **Usuarios y permisos**.
3. Crear o editar el usuario responsable de la pantalla QR.
4. Asignarle **Generador de QR**.
5. En la PC de la oficina, iniciar sesión con ese usuario y dejar abierta la pantalla **Generador de QR**.
