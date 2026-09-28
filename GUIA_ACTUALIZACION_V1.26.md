# Sistema de Control de Asistencia · V1.26

## Objetivo
La V1.26 convierte el sistema en una arquitectura multi-oficina / multi-Dirección manteniendo a la Dirección de Gestión Escolar como oficina inicial y conservando los registros existentes.

## Migración automática
Al ejecutarse por primera vez:
- crea la entidad `offices`;
- crea una configuración independiente por oficina en `office_configs`;
- asigna todos los agentes existentes a **Dirección de Gestión Escolar (DGE)**;
- asigna las asistencias, licencias y QR históricos existentes a DGE;
- asigna los usuarios operativos existentes sin oficina a DGE;
- conserva como Administrador General a la cuenta de contingencia definida por `ADMIN_EMAIL` / `ADMIN_PASSWORD` y a los usuarios que históricamente tenían rol ADMIN.

La migración es aditiva: no elimina tablas ni registros existentes.

## Administrador General
Puede:
- ver el tablero consolidado de todas las oficinas o filtrar una Dirección;
- crear, activar y desactivar oficinas;
- configurar ubicación, radio GPS, tolerancia, vigencia del QR y fecha oficial de inicio por oficina;
- crear usuarios y asignarlos a una oficina;
- combinar permisos por usuario;
- ver y gestionar personal de cualquier oficina;
- acceder a legajos, asistencia y licencias según el alcance general.

## Usuarios de oficina
Cada usuario queda vinculado a una única oficina y puede recibir uno o más permisos:
- Tablero de oficina;
- Gestión de personal;
- Legajos e inasistencias;
- Operador de Licencias;
- Operador de Asistencia.

Las APIs validan la oficina del usuario; no se limita solamente la visualización del menú.

## QR y geolocalización
Cada oficina tiene:
- QR propio;
- coordenadas propias;
- radio GPS propio;
- vigencia de QR propia;
- personal propio.

Un QR de una oficina solo permite identificar y marcar a agentes pertenecientes a esa oficina.

## Reglas por oficina
El Administrador General puede definir para cada oficina:
- radio autorizado;
- tolerancia de ingreso;
- fecha de inicio oficial del cómputo de inasistencias;
- vigencia del QR;
- ubicación geográfica.

El tablero consolidado respeta la tolerancia y la fecha de implementación de cada oficina individualmente.

## Respaldo previo
La versión estable previa es **V1.25.3**. Conservar el ZIP de respaldo antes de desplegar V1.26.

También se recomienda realizar un backup de PostgreSQL/Neon antes de incorporar la segunda oficina. Una vez que existan datos reales de varias oficinas, volver al código V1.25.3 sin restaurar la base no es un rollback operativo seguro, porque esa versión no conoce la separación por oficina.

## Despliegue
1. Realizar backup de la base actual.
2. Subir el contenido completo de este paquete al repositorio conectado a Vercel.
3. No modificar las variables de entorno actuales.
4. Esperar que Vercel finalice el build.
5. Ingresar con Administrador General.
6. Verificar primero que DGE conserve personal, registros, licencias y configuración.
7. Crear la segunda oficina desde **Oficinas**.
8. Configurar ubicación, radio, tolerancia y fecha de inicio.
9. Crear el usuario de esa oficina y asignarle únicamente los permisos necesarios.
10. Recién después cargar su personal y habilitar el QR.

## Validación recomendada antes de uso real en otra Dirección
- DGE muestra los mismos agentes que antes de la actualización.
- Resumen diario DGE conserva los registros actuales.
- El usuario de oficina no puede visualizar agentes de DGE.
- Un agente de DGE no puede marcar con el QR de la nueva oficina.
- Un agente de la nueva oficina no puede marcar con el QR de DGE.
- Las inasistencias comienzan desde la fecha configurada para cada oficina.
- El Administrador General puede ver todas las oficinas y filtrar el tablero.

## Versión
`1.26.0`
