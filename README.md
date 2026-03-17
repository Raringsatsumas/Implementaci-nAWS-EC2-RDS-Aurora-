# BigParcial

Aplicación web full-stack desarrollada para gestionar la base de datos Chinook en la nube, con funcionalidades de compra de canciones, autenticación con roles, administración de canciones, pruebas unitarias y pipeline de CI/CD.

## Descripción

Este proyecto implementa una solución full-stack desplegada en **AWS**, compuesta por:

- **Frontend** en React
- **Backend** en FastAPI
- **Base de datos** relacional Chinook en AWS RDS
- **CI/CD** con GitHub Actions

La aplicación permite:

- Buscar canciones
- Consultar artistas y géneros
- Comprar canciones
- Ver historial de compras por usuario
- Iniciar sesión y registrarse
- Gestionar roles `admin` y `user`
- Crear, editar y eliminar canciones como administrador
- Ejecutar pruebas unitarias en frontend y backend
- Automatizar pruebas y despliegue mediante pipeline

---

## Tecnologías utilizadas

### Frontend
- React
- Vite
- JavaScript
- Vitest
- React Testing Library

### Backend
- FastAPI
- Python
- SQLAlchemy
- PyMySQL
- Uvicorn
- PyTest

### Infraestructura
- AWS EC2
- AWS RDS
- GitHub Actions
- Nginx

---

## Arquitectura general

El sistema sigue una arquitectura cliente-servidor:

- El **frontend** consume una API REST expuesta por el backend
- El **backend** se conecta a la base de datos Chinook en RDS
- La autenticación se maneja con tokens JWT
- El acceso a funcionalidades depende del rol del usuario
- El pipeline automatiza pruebas y despliegue

---

## Funcionalidades principales

### Usuario
- Registro
- Inicio de sesión
- Consulta de canciones
- Compra de canciones
- Visualización de compras propias
- Consulta de artistas y géneros

### Administrador
- Crear canciones
- Editar canciones
- Eliminar canciones
- Asociar canciones a álbumes y artistas existentes
- Validar que no se ingresen precios negativos

---

## Estructura del proyecto

```bash
BigParcial/
├── backend/
│   ├── app/
│   │   ├── routers/
│   │   ├── main.py
│   │   ├── db.py
│   │   └── security.py
│   ├── tests/
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   └── pytest.ini
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.test.jsx
│   │   ├── App.extra.test.jsx
│   │   ├── App.more.test.jsx
│   │   └── services/
│   ├── package.json
│   └── vitest.config.js
│
└── .github/
    └── workflows/
        ├── ci-cd.yml
        └── ci-no-ssh.yml
