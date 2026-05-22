# FarmaExpres Frontend

## Descripción General

FarmaExpres Frontend es la capa web del sistema ERP para gestión farmacéutica.
El proyecto está diseñado para operar por módulos funcionales y control de acceso por roles, con foco en trazabilidad, seguridad y eficiencia operativa.

---

## Alcance Funcional del Sistema

La aplicación contempla los siguientes dominios funcionales:

- Autenticación.
- Dashboard.
- Gestión de usuarios.
- Gestión de medicamentos.
- Inventario (control de stock, entradas y salidas).
- Movimientos.
- Alertas.
- Reportes.
- Auditoría.
- Predicciones de inventario.

Roles de operación:

- Administrador.
- Farmacéutico.
- Auditor.

---

## Referencia de Diseño Funcional

La referencia visual/funcional del sistema se documenta en:

- [Layout funcional del sistema](./Layout.md)
- [Demo de interfaz (Canva)](https://temenico.my.canva.site/farmaexpres)

Backlog funcional (historias de usuario):

- [GitHub Issues - Weeks-6](https://github.com/jose6668/Weeks-6/issues)

---

## Arquitectura del Proyecto

La arquitectura se organiza por dominio funcional para mantener separación de responsabilidades y escalabilidad.

### Estructura objetivo

```bash
FarmaExpres-Frontend/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── medicines/
│   │   ├── users/
│   │   ├── inventory/
│   │   ├── movements/
│   │   ├── reports/
│   │   ├── alerts/
│   │   ├── audit/
│   │   ├── layout/
│   │   └── shared/
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── package.json
├── doc/
│   ├── HU-QA-FE-*.md
│   └── images/
├── Layout/
│   └── images/
├── Layout.md
└── README.md
```

### Estructura interna por módulo

```bash
<module>/
├── pages/
├── components/
├── services/
└── store/
```

---

## Tecnologías

Stack principal del frontend:

- React.
- Vite.
- JavaScript (ES Modules).
- Axios.
- Tailwind CSS.
- ESLint.
- Docker + Nginx.

---

## Configuración Técnica

### Integración con Backend

El frontend consume un gateway único configurable:

- Base URL: `VITE_API_BASE_URL`.
- Si no se define, utiliza rutas relativas (`/api/...`) para apoyarse en proxy (Vite/Nginx).

Archivo de configuración:

- `frontend/src/shared/config/api.js`

Variables de entorno:

- `VITE_API_BASE_URL`

### Integración con el microservicio predictivo

El módulo `Predicciones` no consulta MongoDB directamente. Consume el backend por el gateway:

```text
Frontend React -> API Gateway -> prediction-service -> MongoDB / inventory-service
```

Para que la pantalla funcione en Docker se deben levantar, en este orden, los repositorios del mismo ambiente:

```bash
cd FarmaExpres_Backend
docker compose --env-file .env.dev up -d --build

cd ../FarmaExpres-Micro-NoSQL
docker compose --env-file .env.dev up -d --build

cd ../FarmaExpres-Frontend/frontend
docker compose --env-file .env.dev up -d --build
```

Para `qa` o `main` se cambia el archivo de entorno en los tres repositorios:

```bash
docker compose --env-file .env.qa up -d --build
docker compose --env-file .env.main up -d --build
```

El frontend siempre llama rutas relativas `/api/predictions`; Nginx las envía a `api-gateway:8080` dentro de la red Docker del ambiente.

### Seguridad

- Uso de token Bearer para endpoints protegidos.
- Manejo de autorización por rol en funcionalidades administrativas.
- Estandarización de manejo de errores de autenticación/autorización.

---

## Convenciones de Desarrollo

- Código fuente en inglés.
- Mensajes funcionales orientados a usuario en español.
- Commits bajo estándar Conventional Commits.
- Cambios acotados por historia de usuario.

---

## Ejecución del Proyecto

### Requisitos

- Node.js 18+
- npm 9+

### Desarrollo local

Desde `frontend/`:

```bash
npm install
npm run dev
```

### Build y previsualización

Desde `frontend/`:

```bash
npm run build
npm run preview
```

### Ejecución con Docker

Desde `frontend/`, usando el archivo de ambiente correspondiente:

```bash
docker compose --env-file .env.dev up -d --build
docker compose --env-file .env.qa up -d --build
docker compose --env-file .env.main up -d --build
```

Aplicación disponible en:

- `http://localhost:3000` en dev.
- `http://localhost:4000` en QA.
- `http://localhost:5000` en main.

Para detener contenedores:

```bash
docker compose --env-file .env.dev down
docker compose --env-file .env.qa down
docker compose --env-file .env.main down
```
