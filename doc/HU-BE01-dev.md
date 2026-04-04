(#) HU-BE01-dev

## 1. Identificación

- **Rama:** `HU-BE01-dev`
- **ID:** `HU-BE-01`
- **Relación (Front / QA):** Ajuste de integración para consumir `api-gateway` desde frontend
- **Fecha:** 2026-04-03
- **Responsable:** (añadir nombre)

## 2. Resumen del cambio

En esta rama se unificó el punto de entrada del backend: el frontend ya no consume directamente las URLs de los microservicios individuales, sino que todas las peticiones se encaminan al *API Gateway* (único endpoint). El objetivo es centralizar rutas, CORS y autenticación en el gateway.

## 3. Cambios detectados (frontend)

- `frontend/src/shared/config/api.js`
	- Centraliza `API_BASE_URL` y lee `VITE_API_BASE_URL`.
	- Si `VITE_API_BASE_URL` está vacío, el frontend usa rutas relativas (`/api/...`) para evitar CORS y confiar en proxy (Vite/Nginx).

- `frontend/src/shared/services/api.service.js`
	- Se usan clientes axios (`inventoryApi`, `authApi`) con `baseURL` apuntando a `API_URL`/`AUTH_API_URL` (ambos igual a `API_BASE_URL`).
	- Manejador centralizado de errores y redirección a login en fallos 401/403.

- Servicios de dominio usan rutas relativas a `/api` (ejemplos):
	- `frontend/src/auth/services/auth.service.js` — endpoint de login `/api/auth/login`
	- `frontend/src/medicines/services/medicines.service.js` — endpoints `/api/products`
	- `frontend/src/users/services/users.service.js` — endpoints `/api/users`
	- `frontend/src/movements/services/movements.service.js` — endpoint `/api/movements`

> Nota: No fue necesario hardcodear hosts/puertos en los servicios; las rutas relativas permiten enrutar todo a través del gateway.

## 4. Variables de entorno y despliegue

- Variable principal: `VITE_API_BASE_URL`
	- Ejemplos:
		- `VITE_API_BASE_URL=http://localhost:8080` (gateway local)
		- `VITE_API_BASE_URL=https://api.mi-dominio.com` (producción)
	- Si se deja vacía, el frontend usará rutas relativas (`/api/...`) y será necesario configurar un proxy en desarrollo/producción.

- `.env.local` (local dev):

```
VITE_API_BASE_URL=http://localhost:8080
```

- `docker-compose` (opción): inyectar la variable en el servicio `frontend`:

```yaml
services:
	frontend:
		environment:
			- VITE_API_BASE_URL=http://api-gateway:8080
```

- `nginx` (producción): ejemplo de proxy para enrutar `/api` al gateway:

```
location /api/ {
	proxy_pass http://api-gateway:8080/api/;
	proxy_set_header Host $host;
	proxy_set_header X-Real-IP $remote_addr;
}
```

## 5. Pasos para validar localmente

1. Levantar el API Gateway (local) en `http://localhost:8080`.
2. Crear `.env.local` en `frontend/` con `VITE_API_BASE_URL=http://localhost:8080` (o dejar vacío y usar proxy).
3. Instalar y ejecutar frontend:

```bash
cd frontend
npm install
npm run dev
```

4. En el navegador, verificar en pestaña Red (Network) que las peticiones van a `http(s)://<gateway>/api/...`.
5. Probar login, luego operaciones de Inventario, Movimientos, Usuarios y Reportes; confirmar `Authorization: Bearer <token>` en encabezados.

## 6. Checklist QA específico (Gateway)

- [x] `VITE_API_BASE_URL` presente en entornos (dev/staging/prod) o proxy correctamente configurado.
- [x] Llamadas del frontend llegan al Gateway (no a microservicios directos).
- [x] Respuestas del gateway contienen los mismos campos que esperaba el frontend (validar mapeos en servicios).
- [x] Manejo de errores 401/403 redirige a `/login` y limpia sesión.
- [x] CORS configurado en el gateway para permitir origen del frontend.
- [x] Probar exportaciones (Reportes) y descargas para validar passthrough correcto.

## 7. Notas técnicas y recomendaciones

- Mantener `VITE_API_BASE_URL` sincronizada en pipelines de CI/CD o usar proxy en el servidor web.
- Revisar encabezados y timeouts del gateway para evitar errores 502/504 en operaciones largas (exportación Excel).
- Registrar en logs del gateway las rutas más usadas para observar carga y optimizar.

## 8. PR / Issues relacionados

- PR asociado: (pegar enlace cuando exista)
- Issue de referencia: (pegar número/enlace)

---

Actualiza este documento con enlaces a PR y nombres de responsables cuando estén disponibles.

