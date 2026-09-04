# Sistema de Control de Asistencia DGE · V1.9

Aplicación institucional para la Dirección de Gestión Escolar.

## Cambio principal V1.9

La ruta inicial `/` es ahora una pantalla pública de exhibición del QR dinámico de oficina. No requiere autenticación administrativa. El QR se renueva automáticamente cuando vence y muestra cuenta regresiva, fecha y hora de la oficina.

La administración continúa protegida en `/admin/login`.

## Flujo de marcación

Pantalla pública QR → escaneo desde celular → geolocalización → PIN → dispositivo autorizado → entrada/salida.

## Actualización

Subir el contenido de esta carpeta al repositorio GitHub conectado a Vercel. No reinicializar la base de datos y no modificar las variables de entorno.

## V1.10 — Reinicio de datos de prueba

Se agregó en Administración → Configuración una herramienta protegida para limpiar los datos operativos de prueba sin ejecutar SQL manualmente. Requiere escribir `REINICIAR` para confirmar. Conserva personal, horarios, configuración de la oficina, catálogo de licencias y PINs. Elimina asistencias, novedades/licencias/vacaciones cargadas, vínculos de dispositivos, QR históricos y auditoría de prueba; luego registra el propio reinicio en auditoría.


## V1.11
- Identificador estable de dispositivo guardado en el navegador del celular.
- Evita falsos bloqueos por regeneración de cookies al volver a escanear el QR.
- Mantiene fallback por cookie cuando el almacenamiento local no está disponible.
- Para dispositivos ya afectados por la implementación anterior, desvincular una sola vez desde Administración y volver a escanear.
