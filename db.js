const sql = require('mssql');
require('dotenv').config();

// Configuración para SQL Server
// DATABASE_URL puede ser una cadena de conexión completa:
// Server=localhost;Database=master;User Id=sa;Password=YourPassword;Encrypt=true;TrustServerCertificate=true;
const config = process.env.DATABASE_URL;

const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    console.log('Conectado a SQL Server');
    return pool;
  })
  .catch(err => {
    console.error('Error al conectar con SQL Server: ', err);
    process.exit(1);
  });

module.exports = {
  sql,
  poolPromise
};
