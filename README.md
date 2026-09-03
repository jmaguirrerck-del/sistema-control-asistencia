# Sistema de Control de Asistencia DGE · V1.9

Aplicación institucional para la Dirección de Gestión Escolar.

## Cambio principal V1.9

La ruta inicial `/` es ahora una pantalla pública de exhibición del QR dinámico de oficina. No requiere autenticación administrativa. El QR se renueva automáticamente cuando vence y muestra cuenta regresiva, fecha y hora de la oficina.

La administración continúa protegida en `/admin/login`.

## Flujo de marcación

Pantalla pública QR → escaneo desde celular → geolocalización → PIN → dispositivo autorizado → entrada/salida.

## Actualización

Subir el contenido de esta carpeta al repositorio GitHub conectado a Vercel. No reinicializar la base de datos y no modificar las variables de entorno.
