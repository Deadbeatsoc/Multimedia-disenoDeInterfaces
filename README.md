# Multimedia Diseño de Interfaces

Aplicación móvil construida con Expo Router para el seguimiento de hábitos saludables.
Este repositorio ahora incluye la definición de la base de datos MySQL y un servidor API de Node.js para conectar la app con los datos persistidos.

## Estructura del proyecto

```
├── app/                    # Pantallas y navegación Expo Router
├── components/             # Componentes reutilizables de UI
├── hooks/                  # Hooks personalizados (p. ej. consumo de API)
├── services/               # Clientes HTTP hacia el backend
├── server/                 # API REST en Express + MySQL
├── database/               # Scripts SQL para crear y poblar la base de datos
└── constants/, utils/, types/  # Utilidades y tipados compartidos
```

## Requisitos previos

- Node.js >= 18
- npm o pnpm
- MySQL 8.x (o un servicio compatible) y MySQL Workbench para importar el esquema

## 1. Configuración de la base de datos

1. Abre MySQL Workbench y conéctate a tu servidor MySQL.
2. Ejecuta el script [`database/schema.sql`](database/schema.sql) para crear la base de datos `habit_tracker`, las tablas y los datos de ejemplo.
3. Opcionalmente ajusta los datos iniciales (usuarios, hábitos, notificaciones) según tus necesidades.

El esquema incluye las tablas:
- `users`: información básica del usuario.
- `habits`: hábitos configurados (slug, colores, meta, etc.).
- `habit_entries`: registros históricos y diarios de progreso.
- `notifications`: recordatorios, logros y alertas asociadas a los hábitos.

## 2. Servidor API (Express + MySQL)

1. Copia el archivo de variables de entorno y actualízalo con tus credenciales:

   ```bash
   cd server
   cp .env.example .env
   # edita .env para apuntar a tu instancia MySQL
   ```

2. Instala las dependencias y levanta el servidor:

   ```bash
   npm install
   npm run dev
   ```

   El servicio queda escuchando por defecto en `http://localhost:3000` y expone los siguientes endpoints principales:

   - `GET /api/health` – comprobación del estado del servidor.
   - `GET /api/dashboard` – resumen diario de hábitos, progreso y notificaciones.
   - `GET /api/habits/:habitId/logs` – historial de registros por hábito.
   - `POST /api/habits/:habitId/logs` – crear un nuevo registro de progreso.
   - `GET /api/notifications` – listar notificaciones (pendientes o históricas).
   - `PATCH /api/notifications/:id/read` – marcar notificaciones como leídas.

## 3. Aplicación móvil (Expo)

1. Instala las dependencias del proyecto en la raíz:

   ```bash
   npm install
   ```

2. Configura la URL del backend. Por defecto la app intenta conectarse a `http://localhost:3000/api`. Si necesitas otro host o puerto crea el archivo `app.config.js` o usa una variable de entorno Expo:

   ```bash
   EXPO_PUBLIC_API_URL="http://tu-servidor:3000/api"
   ```

3. Ejecuta la app en modo desarrollo:

   ```bash
   npm run dev
   ```

   Desde la app podrás:
   - Visualizar el progreso diario con datos obtenidos del backend.
   - Registrar agua, ejercicio, alimentación o sueño y sincronizarlo con la base de datos.
   - Consultar recordatorios y marcarlos como atendidos.

## 4. Mapa de funcionalidades

La siguiente tabla relaciona los requisitos planteados para la app de hábitos saludables con las pantallas y archivos más
relevantes dentro del proyecto. Úsala como guía rápida para validar que cada flujo está implementado tanto en la interfaz como en
la lógica de negocio.

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
