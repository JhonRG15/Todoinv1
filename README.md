# To Do In 📍

**To Do In** es una plataforma de geolocalización interactiva donde los usuarios pueden proponer puntos de interés sobre un mapa, y los administradores pueden aprobarlos antes de que sean visibles para todos.

## 🚀 Tecnologías
- **Backend**: Node.js + Express
- **Base de Datos**: SQL Server (Azure SQL)
- **Frontend**: HTML5, CSS3 y JavaScript Vanilla (Mobile-first)
- **Mapas**: Google Maps JavaScript API

## 🛠️ Instalación y Configuración

1. **Clonar el repositorio**:
   ```bash
   git clone <URL_DEL_REPO>
   cd to-do-in
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**:
   Crea un archivo `.env` basado en el siguiente ejemplo:
   ```env
   PORT=3000
   DATABASE_URL=Server=tu_servidor;Database=tu_db;User Id=tu_usuario;Password=tu_password;Encrypt=true;
   SESSION_SECRET=un_secreto_muy_largo
   ```

4. **Inicializar la base de datos**:
   ```bash
   node create-tables.js
   node create-admin.js
   ```

5. **Ejecutar la aplicación**:
   ```bash
   npm start
   ```

## 👥 Usuarios de Prueba (Admin)
- **Email**: `admin@todoin.com`
- **Password**: `admin1234`

## 📄 Licencia
Este proyecto está bajo la Licencia MIT.
