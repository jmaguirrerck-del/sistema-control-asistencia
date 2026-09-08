# Actualización V1.20.1 — recuperación estable del mismo celular

Esta versión corrige falsos bloqueos de “otro dispositivo autorizado” cuando el agente utiliza el mismo celular y el mismo navegador.

## Cambios
- Mantiene el identificador exacto como primera validación.
- Corrige una causa concreta de falsos bloqueos: la huella de modelo/configuración ya NO se usa para decidir que un teléfono pertenece a otro agente, porque dos celulares similares pueden generar la misma huella.
- Agrega un perfil tolerante del equipo basado en plataforma, zona horaria, pantalla física aproximada y capacidad táctil.
- Si cambia el almacenamiento del navegador pero el perfil tolerante coincide, actualiza automáticamente la vinculación.
- Para dispositivos vinculados en versiones anteriores, permite una migración controlada si coincide la familia normalizada del navegador/OS.
- Sigue bloqueando un equipo que ya esté vinculado a otro agente.
- Registra en auditoría las recuperaciones automáticas de identidad del dispositivo.
- No requiere SQL ni desvinculación masiva previa.

## Prueba recomendada
No desvincular primero al agente afectado. Desplegar V1.20.1 y probar con el mismo celular que venía mostrando el error.
