# Actualización V1.20 — generación masiva de PIN provisorios

## Novedad
En **Administración → Personal** se incorpora **Generar PIN provisorios**.

La operación:
- genera un PIN de 6 dígitos únicamente para agentes activos sin PIN configurado;
- no reemplaza PIN personales existentes;
- obliga a cambiar el PIN en el primer uso;
- hace vencer el PIN provisorio a los 7 días;
- muestra el listado una sola vez y permite descargarlo como CSV con `Apellido y nombre | DNI | PIN provisorio | Vence`;
- no guarda los PIN en texto claro en la base ni en la auditoría.

## Uso
1. Ingresar a **Personal**.
2. Seleccionar **Generar PIN provisorios**.
3. Confirmar **Generar PIN pendientes**.
4. Descargar inmediatamente el CSV.
5. Entregar a cada agente únicamente su PIN.

En el primer acceso, el agente deberá definir su PIN personal antes de poder continuar con la marcación.

## Base de datos
La actualización agrega automáticamente el campo `temporary_pin_expires_at`. No requiere ejecutar SQL manual.
