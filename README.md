# Sistema de Control de Asistencia DGE — V1.4

Esta versión agrega administración completa del padrón, edición de horarios, control de dispositivo autorizado y ajusta la lógica de tardanza/compensación.

## Cambios V1.4
- Alta de nuevos agentes desde Administración > Personal.
- Edición de apellido, nombre, DNI, situación de revista y estado activo/inactivo.
- Edición del horario individual de lunes a viernes, incluyendo días sin prestación.
- PIN individual editable.
- Un dispositivo autorizado por agente; la primera marcación válida vincula el celular.
- Bloqueo si un dispositivo vinculado intenta marcar por otro agente.
- Desvinculación de dispositivo desde el panel administrador.
- Tolerancia configurable (definida operativamente en 10 minutos).
- Desde el minuto 11 se genera saldo de atraso a compensar; solo queda tardanza efectiva al cierre si existe saldo pendiente.
- Las asistencias ya cerradas conservan el horario previsto guardado en cada jornada, aunque luego se edite el horario del agente.

## Actualización desde V1.2
Subir esta carpeta como un nuevo deployment en el mismo proyecto de Vercel. No borrar la base de datos ni volver a ejecutar una inicialización destructiva. La tabla de dispositivos se crea automáticamente al abrir Personal o al iniciar una marcación.

# Sistema de Control de Asistencia — Dirección de Gestión Escolar

Aplicación web Next.js para control de asistencia del personal mediante QR dinámico, geolocalización y PIN personal.

## Arquitectura
- Next.js / React
- Vercel
- Neon PostgreSQL
- Autenticación administrativa por cookie firmada
- PIN de empleados almacenado con bcrypt

## Primer despliegue
1. Subir esta carpeta a un proyecto nuevo de Vercel.
2. En **Variables ambientales** agregar:
   - `DATABASE_URL`
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD`
   - `AUTH_SECRET`
3. Desplegar.
4. Ingresar a `/admin/login`.
5. Ir a **Configuración** y pulsar **Inicializar base de datos**.
6. Configurar latitud, longitud y radio de la oficina.
7. Ir a **Personal** y asignar un PIN a cada empleado.
8. Abrir **QR de oficina** en una pantalla fija de la oficina.

## Reglas implementadas
- 46 agentes precargados desde `HORARIO DE PERSONAL ACTUALIZADO.xlsx`.
- Horario semanal individual por empleado.
- Casos especiales confirmados para Cabas, Gómez Moreira, Gómez Palavecino, Cabrera María Cristina, Aguirre Raúl y Bordón Enrique.
- Tolerancia de tardanza configurable (valor inicial: 10 minutos).
- Margen fijo para olvido de salida: 60 minutos.
- Si existe tardanza, el sistema mantiene abierta la posibilidad de compensación: el cierre automático se vuelve elegible después de `salida prevista + tardanza + 60 min`.
- Si no hubo marcación real de salida, el cierre automático usa la **hora teórica de salida**, sin acreditar compensación no registrada.
- Licencias, vacaciones y novedades administrativas incluidas en la estructura.

## Importante sobre el cierre automático
La aplicación ejecuta un cierre "por demanda" cada vez que se consulta el dashboard o se realiza una marcación. También incluye un endpoint `/api/cron/auto-close` para ejecutar el cierre mediante un programador externo o Vercel Cron en una etapa posterior.

Esto evita depender de un proceso residente, ya que Vercel utiliza funciones serverless.


## V1.4
- El formulario de alta/edición de personal aparece inmediatamente arriba de la lista.
- Al abrir Alta, Editar, PIN o Dispositivo, la pantalla desplaza automáticamente al panel correspondiente.
