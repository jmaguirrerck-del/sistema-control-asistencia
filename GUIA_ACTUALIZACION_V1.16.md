# Actualización V1.16

## Importación histórica 2026 confirmada

Esta versión reemplaza el flujo de detección OCR masiva por una importación segura de registros revisados visualmente.

- Solo se incorporan formularios institucionales confirmados.
- Se excluye documentación respaldatoria.
- La importación es idempotente: no duplica registros.
- Las páginas 196, 207 superior, 207 inferior y 209 quedan fuera para carga manual.
- Si un DNI validado no existe actualmente en Personal, el registro no se fuerza: se informa como no incorporado.

En Administración > Importación histórica, usar **Incorporar histórico 2026 confirmado**.
