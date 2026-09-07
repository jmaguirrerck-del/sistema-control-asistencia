# Actualización V1.17 — Identificación estable de dispositivo

Esta versión corrige falsos bloqueos de "otro dispositivo vinculado" cuando el agente continúa usando el mismo teléfono.

## Qué cambia
- Se mantiene el identificador persistente del navegador.
- Se agrega una segunda huella estable de familia de dispositivo basada en capacidades del equipo/navegador.
- Si el navegador regenera su almacenamiento pero la huella del dispositivo coincide, el sistema recupera la vinculación automáticamente.
- Los registros existentes de versiones anteriores se migran automáticamente la primera vez que el agente se identifica con QR + ubicación + PIN válidos.
- Un mismo dispositivo sigue sin poder quedar activo para dos agentes distintos.
- Un dispositivo realmente diferente continúa siendo rechazado hasta que Administración lo desvincule.

## Actualización
Subir todo el contenido del proyecto a GitHub. Vercel debe mostrar `@1.17.0 build` y finalizar en `Ready`.

No es necesario ejecutar SQL ni reinicializar la base. La nueva columna se crea automáticamente.
