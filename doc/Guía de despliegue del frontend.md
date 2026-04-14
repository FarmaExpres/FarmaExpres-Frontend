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

Requisito para integración API al usar Docker:
- Backend de auth/users disponible en `http://localhost:8081`
- Backend de inventario disponible en `http://localhost:8082`
- (Opcional) gateway unificado en `http://localhost:8080`

La aplicación quedará disponible en:

`http://localhost:5173`

Para detener contenedores:

```bash
docker compose down
```

## Variables de entorno

Con la HU-FE-02 implementada, **ya no se requiere configurar token manual** en `.env.local`.
El acceso se realiza desde la pantalla de login y el token se guarda automáticamente en `localStorage`.

Si se requiere apuntar el frontend a otro gateway:

`VITE_API_BASE_URL=http://localhost:8080`
