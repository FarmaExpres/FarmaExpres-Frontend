# FarmaExpres Frontend

Aplicación frontend del proyecto FarmaExpres, desarrollada con React + Vite.

## Estrategia de puertos por ambiente

El frontend adopta la convención:

- `dev`: `3000`
- `qa`: `4000`
- `main`: `5000`

Archivos de variables por ambiente:

- `.env.dev`
- `.env.qa`
- `.env.main`

Variables principales:

- `VITE_DEV_SERVER_PORT`: puerto de Vite (ejecución local con Node).
- `VITE_PROXY_TARGET`: gateway backend al que apunta el proxy `/api` en desarrollo.
- `FRONTEND_PORT`: puerto publicado por Docker para Nginx.
- `BACKEND_URL`: backend usado por Nginx para enrutar `/api` en contenedor.
- `BACKEND_NETWORK`: red Docker externa del backend por ambiente.

## Ejecución local (Node + Vite)

```bash
npm install
npm run dev:dev
```

Comandos por ambiente:

```bash
npm run dev:dev   # localhost:3000
npm run dev:qa    # localhost:4000
npm run dev:main  # localhost:5000
```

## Ejecución con Docker

Antes de levantar el frontend, el backend y el microservicio predictivo deben estar activos en el mismo ambiente. El orden recomendado es:

```bash
cd ../../FarmaExpres_Backend
docker compose --env-file .env.dev up -d --build

cd ../FarmaExpres-Micro-NoSQL
docker compose --env-file .env.dev up -d --build

cd ../FarmaExpres-Frontend/frontend
docker compose --env-file .env.dev up -d --build
```

Desde esta carpeta (`frontend/`), los comandos por ambiente son:

```bash
docker compose --env-file .env.dev up -d --build
docker compose --env-file .env.qa up -d --build
docker compose --env-file .env.main up -d --build
```

La aplicación quedará disponible respectivamente en:

- `http://localhost:3000` (`dev`)
- `http://localhost:4000` (`qa`)
- `http://localhost:5000` (`main`)

Con esta estrategia los 3 ambientes se pueden ejecutar al mismo tiempo porque:

- cada ambiente define `COMPOSE_PROJECT_NAME` en su `.env`
- cada ambiente publica un puerto distinto
- cada ambiente usa un `container_name` distinto
- cada ambiente se conecta a la red de backend correspondiente
- el frontend consume el gateway interno por `http://api-gateway:8080`

Para detener contenedores:

```bash
docker compose --env-file .env.dev down
docker compose --env-file .env.qa down
docker compose --env-file .env.main down
```

## Alineación frontend-backend por ambiente (Docker)

Para conexión directa a contenedores backend, cada ambiente frontend debe unirse a su red backend:

- `dev` -> `BACKEND_NETWORK=farmaexpres-dev_default`
- `qa` -> `BACKEND_NETWORK=farmaexpres-qa_default`
- `main` -> `BACKEND_NETWORK=farmaexpres-main_default`

- URL interna del gateway en contenedores (misma para los tres):

- `dev` -> `BACKEND_URL=http://api-gateway:8080`
- `qa` -> `BACKEND_URL=http://api-gateway:8080`
- `main` -> `BACKEND_URL=http://api-gateway:8080`

Esto mantiene la regla HU-018:

- puertos externos distintos por ambiente
- red por ambiente + puerto interno estable entre contenedores

## Módulo de predicciones

La ruta `/predictions` consume `/api/predictions` por el gateway. Para que los botones de sincronizar, limpiar y recalcular funcionen, también debe estar levantado `FarmaExpres-Micro-NoSQL` con el `.env` del mismo ambiente:

- `dev`: `BACKEND_NETWORK=farmaexpres-dev_default`, API directa `http://localhost:8085`, MongoDB `mongodb://localhost:27017`.
- `qa`: `BACKEND_NETWORK=farmaexpres-qa_default`, API directa `http://localhost:9085`, MongoDB `mongodb://localhost:37017`.
- `main`: `BACKEND_NETWORK=farmaexpres-main_default`, API directa `http://localhost:10085`, MongoDB `mongodb://localhost:47017`.

El usuario final no necesita abrir MongoDB ni el puerto directo del microservicio; esos puertos quedan para diagnóstico local y revisión técnica.

## Troubleshooting rapido

Si al iniciar sesión o consumir `/api` aparece `502 Bad Gateway`:

- verifica que el backend del mismo ambiente esté levantado
- verifica que el microservicio NoSQL esté levantado si el error ocurre en `/predictions`
- verifica que el frontend esté unido a la red backend correcta (`BACKEND_NETWORK`)
- verifica que `BACKEND_URL` sea `http://api-gateway:8080` dentro de Docker

## Variables de entorno

Con la autenticación implementada, **no se usa token manual en `.env.local`**.
El usuario inicia sesión en `/login` y el token se gestiona automáticamente en `localStorage`.

Si se requiere apuntar el frontend a otro gateway en ejecución local:

`VITE_PROXY_TARGET=http://localhost:8080`
