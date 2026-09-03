# Guía de despliegue en Vercel

## 1. Qué subir
Subir la carpeta completa `sistema-control-asistencia` al proyecto de Vercel `sistema-de-control-de-asistencia`.

No subir el Excel por separado: los 46 agentes y sus horarios ya fueron normalizados dentro del proyecto para la carga inicial.

## 2. Variables ambientales
En Vercel > Proyecto > Variables ambientales, crear:

### DATABASE_URL
Usar la cadena de conexión del proyecto Neon ya vinculado.

### ADMIN_EMAIL
Correo que utilizará el administrador para iniciar sesión.

### ADMIN_PASSWORD
Contraseña inicial del administrador. Debe ser larga y exclusiva para esta aplicación.

### AUTH_SECRET
Cadena aleatoria larga (recomendado 32 caracteres o más). Se usa para firmar la sesión del administrador y para identificar PIN de forma segura.

### CRON_SECRET
Opcional en esta primera etapa. Solo se necesita para activar posteriormente un programador automático del cierre de jornadas.

## 3. Primer ingreso
Una vez desplegado:

1. Abrir `https://TU-DOMINIO/admin/login`.
2. Ingresar con `ADMIN_EMAIL` y `ADMIN_PASSWORD`.
3. Entrar a **Configuración**.
4. Pulsar **Inicializar base de datos y cargar los 46 agentes**.

La inicialización es idempotente: se puede ejecutar nuevamente sin duplicar agentes ni horarios.

## 4. Configurar la única oficina
Desde **Configuración**, estando físicamente en la oficina:

1. Pulsar **Usar la ubicación actual de este dispositivo**.
2. Autorizar geolocalización.
3. Verificar latitud y longitud.
4. Definir el radio autorizado (valor inicial sugerido: 75 m).
5. Confirmar la tolerancia de tardanza (valor inicial: 10 min, configurable).
6. Guardar.

El margen por olvido de salida queda fijo en 60 minutos.

## 5. Asignar PIN
Ir a **Personal** y asignar a cada agente un PIN único de 4 a 8 dígitos.

Los PIN se almacenan con hash bcrypt. Además se guarda un identificador criptográfico para poder localizar al agente sin almacenar el PIN en texto plano.

## 6. QR de oficina
Abrir **QR de oficina** en una pantalla ubicada dentro de la dependencia.

El QR es dinámico y se renueva. Al escanearlo, el celular:

1. abre la pantalla de asistencia;
2. solicita geolocalización;
3. valida que esté dentro del radio;
4. recién después habilita el PIN;
5. identifica al agente;
6. ofrece Entrada o Salida según corresponda.

## 7. Regla de salida automática y compensación
- Agente sin tardanza: el cierre queda elegible 60 minutos después de su salida prevista.
- Agente con tardanza: para permitir que compense ese mismo día, el sistema mantiene abierta la jornada hasta `salida prevista + minutos de tardanza + 60 minutos`.
- Si finalmente no marcó salida, el sistema asigna la **hora teórica de salida**, no acredita compensación y deja `Salida automática por sistema`.

Ejemplo: horario 08:00–16:00, entrada 10:00.
- Tardanza: 120 min.
- Puede marcar salida real a las 18:00 y compensar las 2 h.
- Si no marca, el cierre se vuelve elegible a las 19:00 y se registra salida automática 16:00, sin compensación.

## 8. Cierre automático en Vercel
En esta primera versión el cierre se ejecuta cada vez que:
- se abre/actualiza el dashboard; o
- se realiza una marcación.

También está creado `/api/cron/auto-close` para agregar un programador periódico posteriormente. Esto es necesario porque Vercel no mantiene un proceso ejecutándose permanentemente.

## 9. Privacidad
La nómina contiene DNI. Si en el futuro se conecta GitHub, el repositorio debe ser **privado**. No publicar el código fuente de esta aplicación en un repositorio público.
