# Actualización V1.22

## Marcación manual excepcional

Se incorpora el rol **Operador de Asistencia** y la posibilidad de registrar manualmente movimientos de Entrada, Salida y Reingreso en situaciones excepcionales (por ejemplo, celular roto o falla técnica).

Cada marcación manual exige motivo, conserva fecha/hora real, identifica al usuario que la realizó y se registra en auditoría. En la tabla de movimientos queda señalada como **Manual**.

El Operador de Asistencia solo accede al módulo **Registros**. No administra personal, PIN, dispositivos, licencias, QR, configuración ni usuarios. El Administrador conserva todas las facultades, incluyendo eliminación de jornadas y clasificación de salidas intermedias.

## Tolerancia de ingreso

Se incorpora además la regla acordada para el cálculo de tardanza: hasta 15 minutos posteriores al horario previsto no se contabiliza atraso. Si se supera el minuto 15, se computa el total de minutos transcurridos desde la hora prevista.

Ejemplo: horario 08:00; ingreso 08:15 = 0 minutos; ingreso 08:16 = 16 minutos.
