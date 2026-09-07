# Actualización V1.19

Esta versión amplía la importación histórica 2026 con formularios médicos y administrativos validados, manteniendo el lote de vacaciones existente.

## Cambios
- Importación de Actas de Evaluación Médica oficiales confirmadas.
- Importación de Solicitudes de licencia común Art. 30 inc. b confirmadas.
- Se siguen excluyendo certificados, constancias y documentación respaldatoria.
- Se preserva el artículo textual de origen cuando no existe equivalencia segura en el catálogo.
- Nuevo soporte en `leave_records` para artículo de origen, cantidad y unidad (días/horas).
- Importación idempotente: no duplica registros ya cargados.
- Permanecen excluidos para carga manual: pág. 196, pág. 207 superior, pág. 207 inferior y pág. 209.

## Despliegue
Subir el contenido de esta carpeta al repositorio y confirmar en Vercel que el build corresponda a `@1.19.0` y finalice en `Ready`.
