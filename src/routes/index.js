const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken");
const db = require('../db');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
require('dotenv').config();
const TOKEN_KEY = "1234487321";
const SALT = 10;

const router = express.Router();

const transporter = nodemailer.createTransport({
  service : "gmail",
  auth: {
    user: process.env.SENDER_EMAIL,
    pass: process.env.SENDER_EMAIL_PASS,
  },
});

// Ruta para registrar nuevos usuarios
router.post('/register', async (req, res) => {
  try {
    // Obtener username y password del cuerpo de la solicitud
    const { name, lastname, email, password } = req.body;
    // Hashear la contraseña antes de guardarla en la base de datos
    const hashedPassword = bcrypt.hashSync(password, SALT);

    // Preparar la consulta SQL para insertar el nuevo usuario
    const sql = 'INSERT INTO users (name, lastname, email, password) VALUES (?,?,?,?)';

    // Ejecutar la consulta SQL
    db.run(sql, [name, lastname, email, hashedPassword], function (err) {
      if (err) {
        // Manejo de errores al intentar insertar en la base de datos
        console.error(err);
        res.status(500).send(err);
      } else {
        // Usuario registrado con éxito, devolver el ID del nuevo usuario
        
        res.status(201).json({ id: this.lastID });
      }
    });
  } catch (err) {
    // Manejo de errores generales
    console.error(err);
    res.status(500).send('Server error');
  }
});

router.post('/login', async (req, res) => {
  
  try {      
    const { username, password } = req.body;
    const email = username;
    
    const PHash = password;
        // Make sure there is an Email and Password in the request
        if (!(email && password)) {
            res.status(400).send("All input is required");
        }
            
        let user = undefined;
        
        var sql = "SELECT * FROM users WHERE email = ?";
        db.all(sql, email, function(err, rows) {
            if (err){
                res.status(400).json({"error": err.message})
                return;
            }

            user = rows[0];
            
            
            //user exist
            if(!user) return res.status(404).send("Usuario no encontrado.");
            
            //password validate
            if(!bcrypt.compareSync(PHash, user.password)) return res.status(401).send("Password incorrecto.");
            
            //create jwt token
            const expires = 24 * 60 * 60;
            const token = jwt.sign(
                { user_id: user.id},
                  TOKEN_KEY,
                  { expiresIn: expires }              
            );

            user.Token = token;

           return res.status(200).send(user);                
        });	
    
    } catch (err) {
      console.log(err);
    }    
});


router.post('/login2', async (req, res) => {
  
  try {      
    const { username, password } = req.body;
    const email = username;
    
    const PHash = password;
        // Make sure there is an Email and Password in the request
        if (!(email && password)) {
            res.status(400).send("All input is required");
        }
            
        let user = undefined;
        
        var sql = "SELECT * FROM users WHERE email = ?";
        db.all(sql, email, function(err, rows) {
            if (err){
                res.status(400).json({"error": err.message})
                return;
            }

            user = rows[0];
            
            
            //user exist
            if(!user) return res.status(404).send("Usuario no encontrado.");
            
            //password validate
            if(!bcrypt.compareSync(PHash, user.password)) return res.status(401).send("Password incorrecto.");
            
            //create jwt token
            const expires = 24 * 60 * 60;
            const token = jwt.sign(
                { user_id: user.id},
                  TOKEN_KEY,
                  { expiresIn: expires }              
            );

            user.Token = token;

           return res.status(200).send(user);                
        });	
    
    } catch (err) {
      console.log(err);
    }    
});

router.post('/loginAdmin', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Verificar si las credenciales son para el usuario admin
    if (username === 'admin' && password === 'admin') {
      // Crear un objeto de usuario simulado para el admin
      const adminUser = {
        id: 1,  // Puedes asignar un ID específico para el admin
        username: 'admin',
        // ... otros datos del usuario
      };

      // Crear un token (simulado) para el admin
      const expires = 24 * 60 * 60;
      const token = jwt.sign(
        { user_id: adminUser.id },
        TOKEN_KEY,
        { expiresIn: expires }
      );

      adminUser.Token = token;

      // Enviar una respuesta exitosa con el objeto del admin y el token
      return res.status(200).send(adminUser);
    } else {
      // Si las credenciales no son para el admin, devolver un error
      return res.status(401).send("Credenciales incorrectas para admin");
    }
  } catch (err) {
    console.log(err);
    return res.status(500).send('Error en el servidor');
  }
});

router.post('/request-reset', async (req, res) => {
  try{
  const { email } = req.body;
  //flag email
  console.log(email);
  // Buscar al usuario por su email
  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    //flag bd data
    console.log(user);
    if (err) {
      return res.status(500).send('Error en el servidor: ' + err.message);
    }
    if (!user) {
      return res.status(404).send('Usuario no encontrado');
    }

    // Generar un token de restablecimiento
    const resetToken = crypto.randomBytes(20).toString('hex');
    const expiration = new Date();
    expiration.setHours(expiration.getHours() + 1); // Token válido por 1 hora

    // Almacenar el token en la base de datos
    db.run(
      'INSERT INTO password_resets (userId, token, expiration) VALUES (?, ?, ?)',
      [user.id, resetToken, expiration],
      (err) => {
        if (err) {
          return res.status(500).send('Error al guardar el token de restablecimiento');
        }

        // Enviar correo con el token
        const mailOptions = {
          from: process.env.SENDER_EMAIL,
          to: user.email,
          subject: 'Restablecimiento de contraseña',
          text: 'Tu token de restablecimiento es: ' + resetToken,
        };

        transporter.sendMail(mailOptions, (err, info) => {
          if (err) {
            return res.status(500).send('Error al enviar correo electrónico' + err);
          }
          res.send('Correo de restablecimiento enviado a ' + email);
        });
      }
    );
  });
  }catch(err){
    console.log(err);
  }
});

// Restablecer la contraseña
router.post('/reset', (req, res) => {
  const { token, newPassword } = req.body;
  // Verificar el token y la fecha de expiración
  db.get('SELECT * FROM password_resets WHERE token = ?', [token], async (err, reset) => {
    if (err || !reset) {
      return res.status(400).send('Token inválido o expirado');
    }
    if (new Date() > new Date(reset.expiration)) {
      return res.status(400).send('Token expirado');
    }

    // Si el token es válido, permitir al usuario establecer una nueva contraseña
    const hashedPassword = bcrypt.hashSync(newPassword, SALT);
    db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, reset.userId], (err) => {
      if (err) {
        return res.status(500).send('Error al actualizar la contraseña');
      }
      res.send('Contraseña actualizada con éxito');
    });
  });
});

module.exports = router;
