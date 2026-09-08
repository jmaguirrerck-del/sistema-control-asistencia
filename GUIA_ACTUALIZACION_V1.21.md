# Actualización V1.21 — secuencia de movimientos durante la jornada

Esta versión reemplaza el esquema rígido de una única entrada y una única salida por una secuencia de movimientos durante el día.

## Flujo del agente
- Primera marcación: **Entrada**.
- Siguiente marcación: **Salida**.
- Si vuelve a la oficina: **Reingreso**.
- Puede volver a registrar una nueva **Salida** y repetir la secuencia durante la misma jornada.
- El agente no selecciona ni declara el motivo de la salida.

Ejemplo: `08:00 Entrada → 10:30 Salida → 11:15 Reingreso → 16:00 Salida`.

## Administración
En **Registros de asistencia** se visualiza la secuencia completa de movimientos. Cuando una salida tiene un reingreso posterior, se convierte en una **salida intermedia** y queda con `Motivo pendiente`.

Administración puede clasificarla como:
- Trámite / motivo personal
- Atención médica
- Comisión de servicio
- Permiso autorizado
- Licencia por horas
- Salida no justificada
- Otra causa

También puede indicar si ese intervalo **computa como tiempo trabajado** y agregar una observación. La clasificación queda auditada.

## Legajo
El detalle diario del legajo muestra todos los movimientos y los intervalos de salida intermedia con duración, motivo y criterio de cómputo.

## Compatibilidad
- No elimina ni modifica licencias, vacaciones, PIN, dispositivos o datos de personal.
- Los registros de asistencia anteriores continúan siendo compatibles.
- La base se actualiza automáticamente; no requiere ejecutar SQL manualmente.

## Prueba recomendada
1. Marcar entrada.
2. Marcar salida a media jornada.
3. Volver a escanear el QR y registrar reingreso.
4. Registrar la salida final.
5. En Administración → Registros verificar la secuencia y clasificar el intervalo intermedio.
