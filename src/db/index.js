const sqlite3 = require('sqlite3').verbose();

// Conectarse a la base de datos SQLite. Si no existe, se crea una nueva en memoria.
// Pueden utilizar un string con una ruta para crear un archivo o el string ':memory:' para crear una base de datos temporal en memoria.
const db = new sqlite3.Database('./SDAuth.sqlite', (err) => {
  if (err) {
    console.error(err.message);
    throw err;
  }

  console.log('Conectado a la base de datos SQLite.');

  // Crear la tabla 'users' si aún no existe.
  db.run(
    `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name text,
    lastname text,
    email text UNIQUE,
    password text
    )`,
    (err) => {
      if (err) {
        console.log('Posiblemente la tabla users ya existe.');
      } else {
        console.log('Tabla users creada exitosamente!');
      }
    }
  );
  db.run(`CREATE TABLE IF NOT EXISTS password_resets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    token TEXT,
    expiration DATETIME
    )`,
    (err) => {
      if (err) {
        console.log('Posiblemente la tabla password_resets ya existe.');
      } else {
        console.log('Tabla password_resets creada exitosamente!');
      }
    }
    );
});

module.exports = db;
