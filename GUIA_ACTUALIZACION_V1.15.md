# V1.15 – Importación histórica por formularios

- La importación ya no trata cada página del PDF como una licencia.
- Solo registra formularios institucionales detectados: licencia común, SLIC-01 y reconocimiento médico.
- Documentación respaldatoria queda fuera.
- Una página puede contener más de un formulario (superior/inferior).
- Los formularios sin agente identificable muestran página, posición y el formulario reconocido anterior/posterior.
- Exportación CSV exclusiva de formularios no identificados.
- Regla de fechas: ante discrepancia, manda Cantidad + Desde.

Subir el contenido a GitHub y verificar que Vercel compile `@1.15.0 build`.
