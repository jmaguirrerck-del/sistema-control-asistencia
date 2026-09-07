# Actualización V1.18 — Legajo integral del agente

## Novedades
- Nuevo módulo **Legajos** en Administración.
- Consulta integral por agente: datos personales, situación de revista, horarios, antigüedad, PIN y dispositivo.
- Registro/edición directa de fecha de antigüedad reconocida desde el legajo.
- Resumen por período de presentes, ausencias justificadas, ausencias injustificadas, ingresos con atraso, tardanzas efectivas y minutos compensados/no compensados.
- Sección explícita y separada de **Licencias médicas**, licencias administrativas y vacaciones.
- Detalle diario de asistencia y novedades.
- El cálculo de faltas se deriva de los días con prestación prevista: si no hay marcación ni licencia/novedad cargada y el día ya pasó, se clasifica como ausencia injustificada.

## Despliegue
Subir todo el contenido interno de esta versión al repositorio. No reinicializar la base de datos ni modificar variables de entorno. Verificar en Vercel que el build muestre `@1.18.0 build` y finalice en Ready.
