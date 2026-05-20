# FarmaExpres Frontend

Aplicación frontend del proyecto FarmaExpres, desarrollada con React + Vite.

## Ejecución local (Node)

```bash
npm install
npm run dev
```

## Ejecución con Docker (recomendada para el equipo)

El frontend se despliega por ambiente usando archivos `.env`. Antes de levantarlo, debe estar activo el backend del mismo ambiente. Si se va a evaluar el módulo `Predicciones`, también debe estar activo el microservicio NoSQL.

```bash
cd FarmaExpres_Backend
docker compose --env-file .env.dev up -d --build

cd ../FarmaExpres-Micro-NoSQL
docker compose --env-file .env.dev up -d --build

cd ../FarmaExpres-Frontend/frontend
docker compose --env-file .env.dev up -d --build
```

Para otros ambientes se usa el mismo orden:

```bash
docker compose --env-file .env.qa up -d --build
docker compose --env-file .env.main up -d --build
```

Requisito para integración API al usar Docker:
- Gateway del backend disponible por ambiente: `8080` en dev, `9080` en QA y `10080` en main.
- Backend y frontend unidos a la red Docker del mismo ambiente.
- Microservicio predictivo activo si se usa `/predictions`.

La aplicación quedará disponible en:

- `http://localhost:3000` para dev.
- `http://localhost:4000` para QA.
- `http://localhost:5000` para main.

Para detener contenedores:

```bash
docker compose --env-file .env.dev down
docker compose --env-file .env.qa down
docker compose --env-file .env.main down
```

## Variables de entorno

Con la HU-FE-02 implementada, **ya no se requiere configurar token manual** en `.env.local`.
El acceso se realiza desde la pantalla de login y el token se guarda automáticamente en `localStorage`.

Si se requiere apuntar el frontend a otro gateway en ejecución local:

`VITE_API_BASE_URL=http://localhost:8080`

El módulo predictivo consume siempre `/api/predictions` por el gateway. No se debe conectar el frontend directamente a MongoDB.
