const express = require('express');
const { poolPromise, sql } = require('../db');
const { requireAuth, requireAdmin } = require('../authMiddleware');

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/markers — PÚBLICA
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(
      `SELECT m.*, c.nombre AS ciudad_nombre
       FROM marcador m
       LEFT JOIN ciudad c ON m.ciudad_id = c.id
       WHERE m.aprobado = 1 AND m.rechazado = 0
       ORDER BY m.fecha_creacion DESC`
    );
    return res.status(200).json(result.recordset);
  } catch (err) {
    console.error('Error en GET /markers:', err);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/markers/mis-marcadores
// ─────────────────────────────────────────────────────────────────────────────
router.get('/mis-marcadores', requireAuth, async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('usuario_id', sql.UniqueIdentifier, req.session.user.id)
      .query(
        `SELECT m.*, c.nombre AS ciudad_nombre,
                CASE
                  WHEN m.aprobado = 1  THEN 'aprobado'
                  WHEN m.rechazado = 1 THEN 'rechazado'
                  ELSE 'pendiente'
                END AS estado
         FROM marcador m
         LEFT JOIN ciudad c ON m.ciudad_id = c.id
         WHERE m.usuario_id = @usuario_id
         ORDER BY m.fecha_creacion DESC`
      );
    return res.status(200).json(result.recordset);
  } catch (err) {
    console.error('Error en GET /markers/mis-marcadores:', err);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/markers/pending
// ─────────────────────────────────────────────────────────────────────────────
router.get('/pending', requireAdmin, async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(
      `SELECT m.*, u.nombre AS creador, c.nombre AS ciudad_nombre
       FROM marcador m
       LEFT JOIN usuario u ON m.usuario_id = u.id
       LEFT JOIN ciudad c ON m.ciudad_id = c.id
       WHERE m.aprobado = 0 AND m.rechazado = 0
       ORDER BY m.fecha_creacion ASC`
    );
    return res.status(200).json(result.recordset);
  } catch (err) {
    console.error('Error en GET /markers/pending:', err);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/markers
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  const { titulo, descripcion, categoria, latitud, longitud, ciudad_id } = req.body;
  const usuario_id = req.session.user.id;

  if (!titulo || !latitud || !longitud || !categoria) {
    return res.status(400).json({ message: 'Campos obligatorios faltantes' });
  }

  try {
    const pool = await poolPromise;
    await pool.request()
      .input('usuario_id', sql.UniqueIdentifier, usuario_id)
      .input('ciudad_id', sql.Int, ciudad_id || null)
      .input('titulo', sql.VarChar, titulo.trim())
      .input('descripcion', sql.Text, descripcion || null)
      .input('categoria', sql.VarChar, categoria)
      .input('latitud', sql.Decimal(10, 8), latitud)
      .input('longitud', sql.Decimal(11, 8), longitud)
      .query(`
        INSERT INTO marcador (id, usuario_id, ciudad_id, titulo, descripcion, categoria, latitud, longitud, aprobado, rechazado)
        VALUES (NEWID(), @usuario_id, @ciudad_id, @titulo, @descripcion, @categoria, @latitud, @longitud, 0, 0)
      `);

    return res.status(201).json({ message: 'Marcador creado' });
  } catch (err) {
    console.error('Error en POST /markers:', err);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/markers/:id
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { titulo, descripcion, categoria, ciudad_id } = req.body;
  const usuario_id = req.session.user.id;

  try {
    const pool = await poolPromise;
    const found = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('SELECT * FROM marcador WHERE id = @id');

    if (found.recordset.length === 0) return res.status(404).json({ message: 'No encontrado' });

    const marker = found.recordset[0];
    if (marker.usuario_id.toLowerCase() !== usuario_id.toLowerCase()) return res.status(403).json({ message: 'Prohibido' });
    if (marker.aprobado || marker.rechazado) return res.status(400).json({ message: 'No editable' });

    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('titulo', sql.VarChar, titulo || marker.titulo)
      .input('descripcion', sql.Text, descripcion ?? marker.descripcion)
      .input('categoria', sql.VarChar, categoria || marker.categoria)
      .input('ciudad_id', sql.Int, ciudad_id ?? marker.ciudad_id)
      .query(`
        UPDATE marcador
        SET titulo = @titulo, descripcion = @descripcion, categoria = @categoria, ciudad_id = @ciudad_id
        WHERE id = @id
      `);

    return res.status(200).json({ message: 'Actualizado' });
  } catch (err) {
    console.error('Error en PATCH /markers/:id:', err);
    return res.status(500).json({ message: 'Error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/markers/:id
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const usuario_id = req.session.user.id;

  try {
    const pool = await poolPromise;
    const found = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('SELECT * FROM marcador WHERE id = @id');

    if (found.recordset.length === 0) return res.status(404).json({ message: 'No encontrado' });

    const marker = found.recordset[0];
    if (marker.usuario_id.toLowerCase() !== usuario_id.toLowerCase()) return res.status(403).json({ message: 'Prohibido' });
    if (marker.aprobado || marker.rechazado) return res.status(400).json({ message: 'No eliminable' });

    await pool.request().input('id', sql.UniqueIdentifier, id).query('DELETE FROM marcador WHERE id = @id');
    return res.status(200).json({ message: 'Eliminado' });
  } catch (err) {
    return res.status(500).json({ message: 'Error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/markers/:id/approve
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id/approve', requireAdmin, async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, req.params.id)
      .query('UPDATE marcador SET aprobado = 1, rechazado = 0 WHERE id = @id');
    
    if (result.rowsAffected[0] === 0) return res.status(404).json({ message: 'No encontrado' });
    return res.status(200).json({ message: 'Aprobado' });
  } catch (err) {
    return res.status(500).json({ message: 'Error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/markers/:id/reject
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id/reject', requireAdmin, async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, req.params.id)
      .query('UPDATE marcador SET rechazado = 1, aprobado = 0 WHERE id = @id');

    if (result.rowsAffected[0] === 0) return res.status(404).json({ message: 'No encontrado' });
    return res.status(200).json({ message: 'Rechazado' });
  } catch (err) {
    return res.status(500).json({ message: 'Error' });
  }
});

module.exports = router;
