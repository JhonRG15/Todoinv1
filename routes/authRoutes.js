const express = require('express');
const bcrypt = require('bcryptjs');
const { poolPromise, sql } = require('../db');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { nombre, email, password } = req.body;

  if (!nombre || !email || !password) {
    return res.status(400).json({ message: 'Todos los campos son obligatorios' });
  }

  try {
    const pool = await poolPromise;
    
    // Verificar si el email ya existe
    const existing = await pool.request()
      .input('email', sql.VarChar, email.toLowerCase().trim())
      .query('SELECT id FROM usuario WHERE email = @email');

    if (existing.recordset.length > 0) {
      return res.status(400).json({ message: 'El usuario ya existe' });
    }

    // Hash de la contraseña
    const password_hash = await bcrypt.hash(password, 10);
    
    // SQL Server usa NEWID() para UUIDs
    await pool.request()
      .input('nombre', sql.VarChar, nombre.trim())
      .input('email', sql.VarChar, email.toLowerCase().trim())
      .input('password_hash', sql.Text, password_hash)
      .query(`
        INSERT INTO usuario (id, nombre, email, password_hash, rol)
        VALUES (NEWID(), @nombre, @email, @password_hash, 'usuario')
      `);

    // Recuperamos el usuario recién creado
    const result = await pool.request()
      .input('email', sql.VarChar, email.toLowerCase().trim())
      .query('SELECT id, nombre, email FROM usuario WHERE email = @email');

    return res.status(201).json(result.recordset[0]);
  } catch (err) {
    console.error('Error en /register:', err);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Credenciales inválidas' });
  }

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('email', sql.VarChar, email.toLowerCase().trim())
      .query('SELECT id, nombre, email, password_hash, rol FROM usuario WHERE email = @email');

    if (result.recordset.length === 0) {
      return res.status(400).json({ message: 'Credenciales inválidas' });
    }

    const user = result.recordset[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return res.status(400).json({ message: 'Credenciales inválidas' });
    }

    // Crear sesión
    req.session.user = {
      id: user.id,
      nombre: user.nombre,
      rol: user.rol
    };

    return res.status(200).json({
      id: user.id,
      nombre: user.nombre,
      rol: user.rol
    });
  } catch (err) {
    console.error('Error en /login:', err);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error al destruir la sesión:', err);
      return res.status(500).json({ message: 'Error al cerrar sesión' });
    }
    res.clearCookie('connect.sid');
    return res.status(200).json({ message: 'Sesión cerrada' });
  });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  if (req.session && req.session.user) {
    return res.status(200).json({ user: req.session.user });
  }
  return res.status(200).json({ user: null });
});

module.exports = router;
