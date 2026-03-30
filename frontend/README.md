# FarmaExpres Frontend

Aplicación frontend del proyecto FarmaExpres, desarrollada con React + Vite.

## Ejecución local (Node)

```bash
npm install
npm run dev
```

## Ejecución con Docker (recomendada para el equipo)

Desde esta carpeta (`frontend/`):

```bash
docker compose up --build
```

La aplicación quedará disponible en:

`http://localhost:5173`

Para detener contenedores:

```bash
docker compose down
```

## Variables de entorno

Con la autenticación implementada, **no se usa token manual en `.env.local`**.
El usuario inicia sesión en `/login` y el token se gestiona automáticamente en `localStorage`.

Si se requiere apuntar el frontend a otro gateway:

`VITE_API_BASE_URL=http://localhost:8080`
