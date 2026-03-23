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

Para pruebas locales sin login implementado, puedes usar:

`VITE_DEV_TOKEN=<token_jwt>`

en el archivo `.env.local`.
