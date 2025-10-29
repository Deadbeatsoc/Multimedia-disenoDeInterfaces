# Multimedia Diseño de Interfaces

Aplicación móvil construida con Expo Router para el seguimiento de hábitos saludables.
Este repositorio ahora incluye la definición de la base de datos PostgreSQL y un servidor API de Node.js para conectar la app con los datos persistidos.

## Estructura del proyecto

```
├── app/                    # Pantallas y navegación Expo Router
├── components/             # Componentes reutilizables de UI
├── hooks/                  # Hooks personalizados (p. ej. consumo de API)
├── services/               # Clientes HTTP hacia el backend
├── server/                 # API REST en Express + PostgreSQL
├── database/               # Scripts SQL para crear y poblar la base de datos
└── constants/, utils/, types/  # Utilidades y tipados compartidos
```

## Requisitos previos

- Node.js >= 18
- npm o pnpm
- PostgreSQL 14+ (o un servicio administrado compatible) y pgAdmin para gestionar la base de datos

## 1. Configuración detallada en pgAdmin 4

A continuación se describe el flujo completo, desde instalar PostgreSQL y pgAdmin hasta dejar la API conectada.

### 1.1 Instalar PostgreSQL y pgAdmin 4

1. Descarga el instalador oficial de PostgreSQL desde [postgresql.org/download](https://www.postgresql.org/download/) y ejecuta la instalación.
2. Durante el asistente activa la opción **pgAdmin 4** (se instala junto con PostgreSQL en Windows y macOS).
3. Anota la contraseña del usuario administrador `postgres` que defines en el asistente; la necesitarás para conectarte desde pgAdmin y desde la API.

> En distribuciones Linux, instala los paquetes `postgresql` y `pgadmin4` desde el gestor correspondiente y asegúrate de que el servicio `postgresql` quede iniciado.

### 1.2 Crear un servidor en pgAdmin

1. Abre **pgAdmin 4** y, cuando te lo pida, define una contraseña maestra para proteger tus conexiones guardadas.
2. En el panel izquierdo, haz clic derecho sobre **Servers → Create → Server…**.
3. En la pestaña **General** escribe un nombre descriptivo, por ejemplo `HabitTrackerLocal`.
4. En la pestaña **Connection** configura:
   - **Host name/address**: `localhost` (o la IP/DNS de tu servidor si está en otra máquina).
   - **Port**: `5432` (puedes cambiarlo si configuraste PostgreSQL con otro puerto).
   - **Maintenance database**: `postgres`.
   - **Username**: `postgres` (o el usuario administrativo que creaste).
   - **Password**: introduce la contraseña que definiste al instalar PostgreSQL y marca **Save password** para que pgAdmin la recuerde.
5. Guarda; el nuevo servidor aparecerá conectado en el panel.

### 1.3 Crear la base de datos y el usuario dedicados

1. Expande tu servidor → **Databases** y haz clic derecho en **Create → Database…**.
2. Asigna el nombre `habit_tracker` y confirma con **Save**.
3. (Opcional pero recomendado) Crea un rol dedicado para la aplicación:
   - Ve a **Login/Group Roles → Create → Login/Group Role…**.
   - Pestaña **General**: nombre `habit_tracker_app`.
   - Pestaña **Definition**: define una contraseña segura.
   - Pestaña **Privileges**: marca **Can login?**.
   - Guarda.
4. Otorga permisos sobre la base recién creada. Ejecuta en el Query Tool conectado a `postgres`:

   ```sql
   GRANT ALL PRIVILEGES ON DATABASE habit_tracker TO habit_tracker_app;
   ```

5. Conéctate ahora a la base `habit_tracker` y, desde el Query Tool, crea el esquema ejecutando el script [`database/schema.sql`](database/schema.sql). Si lo prefieres, importa el archivo desde **Query Tool → Open File** y pulsa **Execute ▶︎**.

### 1.4 Verificar tablas y datos

Tras ejecutar el script deberías ver en `habit_tracker → Schemas → public → Tables` todas las tablas (`users`, `habit_types`, `user_habits`, etc.).
Para comprobar los datos semilla puedes ejecutar consultas como `SELECT * FROM habit_types;` desde el Query Tool.

### 1.5 Registrar la conexión para la API

Necesitarás los siguientes datos para configurar el backend:

| Dato | Ejemplo | Descripción |
| --- | --- | --- |
| Host | `localhost` | Dirección del servidor PostgreSQL (usa la IP si está en la red o la URL si es un servicio en la nube). |
| Puerto | `5432` | Puerto de escucha. |
| Base de datos | `habit_tracker` | Nombre creado en el paso 1.3. |
| Usuario | `habit_tracker_app` | Rol dedicado o `postgres` si decides reutilizarlo. |
| Contraseña | `••••••` | Clave del usuario anterior. |
| SSL | `false` | Cambia a `true` o `require` si tu proveedor exige TLS. |

### 1.6 Esquema incluido

El script [`database/schema.sql`](database/schema.sql) crea tablas normalizadas que cubren los flujos de la aplicación:
- `users`: credenciales básicas (`name`, `email`, `password_hash`) y la fecha de alta.
- `user_metrics`: histórico opcional de medidas, metas recomendadas y notas de seguimiento.
- `habit_types`: catálogo de hábitos soportados (agua, sueño, ejercicio, alimentación).
- `user_habits`: instancia de cada hábito que configura una persona, con metas, recordatorios y metadatos.
- `water_settings`, `sleep_schedules`, `exercise_preferences`, `nutrition_meals`: parámetros específicos de cada tipo de hábito.
- `habit_entries`: registros diarios con origen, notas y valores numéricos para el progreso.
- `habit_reminders`: programación recurrente de alertas por día y frecuencia.
- `notifications`: mensajes enviados (recordatorios, logros, alertas) incluyendo el canal.
- `notification_channels`: direcciones verificadas para push, correo o SMS.

## 2. Conectar la API Express con PostgreSQL

1. Copia el archivo de variables de entorno y completa los datos obtenidos en la tabla anterior:

   ```bash
   cd server
   cp .env.example .env
   ```

2. Edita `server/.env` con tus credenciales:

   ```dotenv
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=habit_tracker_app
   DB_PASSWORD=tu_contraseña_segura
   DB_NAME=habit_tracker
   DB_SSL=false
   JWT_SECRET=clave_ultra_secreta
   ```

   > Si tu base está en un servicio administrado (Render, Supabase, Railway, etc.) sustituye los valores por los que proporcione el proveedor y ajusta `DB_SSL=true` cuando sea necesario.

3. Instala las dependencias del backend y levanta el servidor en modo desarrollo:

   ```bash
   npm install
   npm run dev
   ```

   El comando anterior ejecuta `nodemon` y se conectará automáticamente a PostgreSQL usando las credenciales definidas. Si la conexión falla revisa el log en consola y confirma que el puerto sea accesible (abre puertos en firewalls si estás en otra máquina).

4. Verifica la conexión realizando una petición desde otra terminal:

   ```bash
   curl http://localhost:3000/api/health
   ```

   Deberías obtener una respuesta JSON con `{ "status": "ok" }`. Si aparece un error `ECONNREFUSED` o credenciales inválidas, revisa nuevamente tu `.env` y que el servicio PostgreSQL esté iniciado.

5. El servicio queda escuchando por defecto en `http://localhost:3000` y expone los siguientes endpoints principales:

   - `POST /api/auth/register` – crea un usuario nuevo con contraseña cifrada (bcryptjs).
   - `POST /api/auth/login` – valida credenciales y entrega un token JWT.
   - `GET /api/auth/me` – devuelve los datos del usuario autenticado.
   - `GET /api/health` – comprobación del estado del servidor.
   - `GET /api/dashboard` – resumen diario de hábitos, progreso y notificaciones (requiere token).
   - `GET /api/habits/:habitId/logs` – historial de registros por hábito (requiere token).
   - `POST /api/habits/:habitId/logs` – crear un nuevo registro de progreso (requiere token).
   - `GET /api/notifications` – listar notificaciones (pendientes o históricas, requiere token).
   - `PATCH /api/notifications/:id/read` – marcar notificaciones como leídas (requiere token).

### 2.1 Autenticación y uso del token JWT

1. **Registro**. Envía nombre, correo y contraseña a `/api/auth/register`. El backend devuelve el token listo para guardarse en el cliente.

   ```bash
   curl -X POST http://localhost:3000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"name":"María Gómez","email":"maria@example.com","password":"demo123"}'
   ```

   Respuesta esperada:

   ```json
   {
     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     "user": {
       "id": 1,
       "name": "María Gómez",
       "email": "maria@example.com",
       "createdAt": "2024-01-01T12:00:00.000Z"
     }
   }
   ```

2. **Inicio de sesión**. Repite el flujo con `/api/auth/login` para usuarios existentes.

   ```bash
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"maria@example.com","password":"demo123"}'
   ```

3. **Guardar y reutilizar el token**. Una vez que la app guarda el token, todas las peticiones protegidas deben incluirlo en el encabezado `Authorization`.

   ```bash
   curl http://localhost:3000/api/dashboard \
     -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   ```

4. **Ejemplo con `fetch` en la app Expo**. Después de un login exitoso guarda el token (por ejemplo, en contexto o SecureStore) y úsalo en las llamadas posteriores.

   ```ts
   const token = await authenticateUser(email, password);

   const response = await fetch(`${apiUrl}/habits/${habitId}/logs`, {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       Authorization: `Bearer ${token}`,
     },
     body: JSON.stringify({ value: 250, notes: 'Vaso de agua' }),
   });
   ```

   Si el token falta o es inválido el servidor responderá con `401 Unauthorized`. Al incluirlo correctamente cada usuario verá únicamente sus hábitos, registros y notificaciones.

## 3. Conectar la app Expo con la API

1. Instala las dependencias del proyecto en la raíz (si no lo hiciste antes para el backend, puedes ejecutar ambos `npm install` en paralelo porque usan `package.json` distintos):

   ```bash
   npm install
   ```

2. Indica a la app dónde vive el backend. La forma más sencilla es crear un archivo `app.config.js` en la raíz con:

   ```js
   export default {
     expo: {
       extra: {
         apiUrl: "http://localhost:3000/api",
       },
     },
   };
   ```

   También puedes definir la variable `EXPO_PUBLIC_API_URL` antes de correr el proyecto, lo cual resulta útil si la API está en otra máquina (reemplaza `localhost` por la IP o dominio accesible desde tu dispositivo móvil).

3. Ejecuta la app en modo desarrollo:

   ```bash
   npm run dev
   ```

4. Desde la consola de Expo elige si deseas abrir la app en un emulador o en Expo Go. Asegúrate de que el dispositivo pueda alcanzar la URL configurada (si está en otra red, usa túneles o expón el puerto 3000).

5. Al iniciar sesión o registrar hábitos, la app consumirá los endpoints del backend y estos persistirán los datos en PostgreSQL. Revisa el panel de pgAdmin para observar cómo se insertan filas en tablas como `user_habits`, `habit_entries` o `notifications` conforme utilices la app.

6. Si necesitas depurar la comunicación puedes abrir la pestaña **Network** en Expo DevTools o revisar los logs del servidor Express; ambos reflejarán las consultas que llegan a PostgreSQL.

Con esta configuración tendrás pgAdmin 4 gestionando la base de datos PostgreSQL, el backend Express conectado mediante el cliente `pg` y la aplicación móvil sincronizando hábitos, recordatorios y progreso en tiempo real.

---

## 4. Mapa de funcionalidades

La siguiente tabla relaciona los requisitos planteados para la app de hábitos saludables con las pantallas y archivos más relevantes dentro del proyecto. Úsala como guía rápida para validar que cada flujo está implementado tanto en la interfaz como en la lógica de negocio.

| Requisito | Implementación principal |
| --- | --- |
| Registro en dos pasos solicitando usuario, correo, contraseña, altura, peso y edad | [`app/index.tsx`](app/index.tsx) maneja el formulario, validaciones y el alta en el contexto global |
| Recomendación de agua según altura y peso con posibilidad de meta personalizada | Lógica en [`context/AppContext.tsx`](context/AppContext.tsx) (`computeRecommendedWater`, `updateWaterSettings`) y controles en [`app/(tabs)/habits.tsx`](app/(tabs)/habits.tsx) |
| Rutinas de sueño con recordatorios antes de dormir | Configuración editable en [`app/(tabs)/habits.tsx`](app/(tabs)/habits.tsx) y persistencia en el contexto (`updateSleepSettings`) |
| Recordatorios de comidas configurables por horario | Sección de alimentación en [`app/(tabs)/habits.tsx`](app/(tabs)/habits.tsx) y manejo de recordatorios en `updateNutritionSettings` |
| Registro y recordatorios de ejercicio diario | Componente `HabitTracker` en [`components/HabitTracker.tsx`](components/HabitTracker.tsx) y actualizaciones vía `updateExerciseSettings` |
| Panel diario con progreso, acciones rápidas y recordatorios | Vista principal [`app/(tabs)/index.tsx`](app/(tabs)/index.tsx) apoyada por el hook [`hooks/useDashboardData.ts`](hooks/useDashboardData.ts) |
| Estadísticas históricas con gráficos y logros | Pantalla [`app/(tabs)/stats.tsx`](app/(tabs)/stats.tsx) que utiliza el componente [`components/ProgressChart.tsx`](components/ProgressChart.tsx) |
| Perfil editable para actualizar datos y recalcular recomendaciones | Pantalla [`app/(tabs)/profile.tsx`](app/(tabs)/profile.tsx) y método `updateProfile` en el contexto |
| Persistencia y API REST | Esquema SQL en [`database/schema.sql`](database/schema.sql) y servidor Express en [`server/index.js`](server/index.js) |

## Notas adicionales

- El hook `useDashboardData` maneja automáticamente la carga de información y el fallback en caso de que el backend no esté disponible.
- Los componentes de seguimiento (`WaterTracker`, `HabitTracker`, `SleepTracker`) se actualizan al guardar un registro y refrescan la información desde la API.
- Para ajustar la lógica de notificaciones o añadir nuevos hábitos, modifica tanto el esquema SQL como las rutas en `server/index.js` y actualiza los tipos en `types/api.ts`.

## Scripts útiles

- `npm run dev` – inicia Expo en modo desarrollo.
- `npm run lint` – ejecuta el linter configurado por Expo.
- Dentro de `server/`:
  - `npm run dev` – arranca la API con recarga automática (nodemon).
  - `npm start` – arranca la API en modo producción.

---
¡Listo! Con estos pasos tendrás la base de datos, el backend y la app móvil trabajando en conjunto para gestionar hábitos, notificaciones y registros diarios.
