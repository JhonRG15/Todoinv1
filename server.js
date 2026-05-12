require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');

const path = require('path');
const authRoutes = require('./routes/authRoutes');
const markerRoutes = require('./routes/markerRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── ARCHIVOS ESTÁTICOS ──────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname)));

// ─── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5500'];

app.use(cors({
  origin: function (origin, callback) {
    // Permitir requests sin origin (Postman, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    return callback(new Error('Origen no permitido por CORS'));
  },
  credentials: true  // CRÍTICO para que las cookies de sesión funcionen
}));

// ─── MIDDLEWARES ──────────────────────────────────────────────────────────────
app.use(express.json());

// ─── SESSION ──────────────────────────────────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback_secret_no_usar_en_produccion',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 86400000  // 24 horas en ms
  }
}));

// ─── RUTAS ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/markers', markerRoutes);

// Ruta de healthcheck
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: 'Ruta no encontrada' });
});

// ─── ERROR HANDLER ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Error no manejado:', err);
  res.status(500).json({ message: 'Error interno del servidor' });
});

// ─── INICIAR SERVER ───────────────────────────────────────────────────────────
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`✅ To Do In server corriendo en http://localhost:${PORT}`);
  });
}

module.exports = app;
