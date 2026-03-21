# FarmaExpres — Frontend

## Descripción General

FarmaExpres es una aplicación web tipo ERP enfocada en la gestión de inventario para una farmacia. Este repositorio corresponde al frontend del sistema, encargado de la interacción con el usuario y la visualización de la información.

El objetivo del frontend es proporcionar una interfaz clara, eficiente y escalable que permita:

* Visualizar información en tiempo real
* Gestionar el inventario de medicamentos
* Controlar usuarios y roles
* Registrar movimientos de entrada y salida
* Generar reportes y alertas

---

## Arquitectura del Proyecto

El proyecto utiliza Screaming Architecture, donde la estructura del código refleja directamente el dominio del negocio.

Esto permite que cualquier desarrollador entienda rápidamente el propósito del sistema solo viendo la estructura de carpetas.

### Estructura principal

```bash
src/
│
├── auth/
├── dashboard/
├── medicines/
├── users/
├── inventory/
├── movements/
├── reports/
├── alerts/
├── audit/
└── shared/
```

### Organización interna de cada módulo

Cada módulo está desacoplado y contiene su propia lógica:

```bash
medicines/
│
├── pages/
├── components/
├── services/
└── store/
```

Este enfoque permite:

* Escalabilidad del sistema
* Mantenimiento sencillo
* Separación clara de responsabilidades

---

## Tecnologías utilizadas

El frontend será desarrollado con tecnologías modernas y ampliamente utilizadas en la industria:

* React (Vite)
* JavaScript (ES6+)
* Tailwind CSS
* React Router DOM
* Axios
* Zustand

---

## Integración con Backend

La comunicación con el backend se realizará mediante peticiones HTTP centralizadas.

```js
import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:3000/api'
})

export default api
```

Cada módulo tendrá su propio archivo de servicios para consumir endpoints específicos.

---

## Autenticación y Seguridad

El sistema implementará:

* Inicio de sesión mediante credenciales
* Manejo de token (JWT)
* Almacenamiento en localStorage
* Protección de rutas privadas
* Control de acceso basado en roles

---

## Roles del Sistema

El sistema contempla tres tipos de usuarios:

* Administrator
* Pharmacist
* Auditor

Cada rol tendrá acceso limitado a funcionalidades específicas.

---

## Módulos Funcionales

El frontend estará compuesto por los siguientes módulos:

1. Authentication
2. Dashboard
3. Medicines Management
4. Users Management
5. Inventory
6. Entries
7. Exits
8. Movements
9. Reports
10. Alerts
11. Stock Control
12. Audit

Cada módulo es independiente y representa una parte del negocio.

---

## Gestión de Estado

Se utilizará Zustand para manejar:

* Usuario autenticado
* Token de sesión
* Datos globales compartidos

---

## Diseño de Interfaz

El diseño seguirá un enfoque tipo dashboard:

* Interfaz limpia y minimalista
* Componentes reutilizables
* Experiencia de usuario clara
* Adaptabilidad (responsive design)

---

## Instalación del Proyecto

```bash
npm create vite@latest
cd farmaexpres-frontend
npm install
npm install axios react-router-dom zustand tailwindcss
```

---

## Ejecución

```bash
npm run dev
```
