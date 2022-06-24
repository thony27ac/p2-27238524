const express = require('express');
const router = express.Router();
const sqlite3=require('sqlite3').verbose();
const http=require('http');
const path = require('path');
const geoip = require('geoip-lite');
const nodemailer = require('nodemailer');
const passport = require('passport');
const cookieParser= require('cookie-parser');
const session = require('express-session');
const PassportLocal = require('passport-local').Strategy;
require('dotenv').config();

router.use(express.urlencoded({extended: true}));
router.use(cookieParser(process.env.BARBER));
router.use(session({
	secret: process.env.BARBER,
	resave: true,
	saveUninitialized: true
}));

router.use(passport.initialize());
router.use(passport.session());

passport.use( new PassportLocal(function(username, password, done){

	if(username === process.env.USUARIO && password === process.env.CONTRASEÑA)
		return done(null,{id: 1, name: "Anthony"});

	done(null, false)
}))

passport.serializeUser(function(user, done){
	done(null, user.id)
})

passport.deserializeUser(function(user, done){
	done(null,{id: 1, name: "Anthony"});
})


const db=path.join(__dirname,"database","basededatos.db");
const db_run=new sqlite3.Database(db, err =>{ 
if (err){
	return console.error(err.message);
}else{
	console.log("DB active");
}
})

const crear="CREATE TABLE IF NOT EXISTS contacts(email VARCHAR(16),nombre VARCHAR(16), comentario TEXT,fecha DATATIME,ip VARCHAR(15), pais VARCHAR(20));";


db_run.run(crear,err=>{
	if (err){
	return console.error(err.message);
}else{
	console.log("Tb active");
}
})

router.get('/login',(req,res)=>{
	res.render('login.ejs')
});

router.post('/login', passport.authenticate('local',{
	successRedirect: "/contactos",
	failureRedirect: "/login"
}));

router.get('/contactos',(req, res, next)=>{
	if(req.isAuthenticated()) return next();

	res.redirect("/login")
},(req,res)=>{
	const sql="SELECT * FROM contacts;";
	db_run.all(sql, [],(err, rows)=>{
			if (err){
				return console.error(err.message);
			}else{
			res.render("contactos.ejs",{ct:rows});
			}
	})
})

router.post('/',(req,res)=>{
	let today = new Date();
	let hours = today.getHours();
	let minutes = today.getMinutes();
	let seconds = today.getSeconds();
	let fech = today.getDate() + '-' + ( today.getMonth() + 1 ) + '-' + today.getFullYear() +' - '+ hours + ':' + minutes + ':' + seconds + ' ';
  let ip = req.headers["x-forwarded-for"].split(',').pop()??
  req.ip.split(':').pop();
	if (ip){
	let list = ip.split(",");
  ip = list[list.length-1];
	} else {
  ip = req.connection.remoteAddress;
	}
	let geo = geoip.lookup(ip);
 	let country = geo.country;
  const sql="INSERT INTO contacts(email, nombre, comentario, fecha, ip, pais) VALUES (?,?,?,?,?,?)";
  const nuevos_mensajes=[req.body.email, req.body.nombre, req.body.comentario,fech,ip,pais];
  
  db_run.run(sql, nuevos_mensajes, err =>{
  if (err){
	  return console.error(err.message);
  }
  else{
	  res.redirect("/");
	  }
	  let transporter = nodemailer.createTransport({
				  host: "smtp-mail.outlook.com",
				  secureConnection: false, 
				  port: 587, 
				  auth: {
					  user: process.env.CORREO,
					  pass: process.env.PASS

				  },
					  tls: {
						ciphers:'SSLv3'
					 }
		  });
			  
			  const recibir_transmitir = {
				  from: process.env.CORREO,
				  to: 'programacion2ais@dispostable.com',
				  subject: 'Informacion del Contacto', 
				  html:`
				  <h1>Task 3 P2</h1>
				  <br>
				  <h3>Información del CLiente</h3>
				  <br>
				  <b>Email:</b> ${req.body.email}
				  <br>
				  <b>Nombre:</b> ${req.body.nombre}
				  <br>
				  <b>Comentario:</b> ${req.body.comentario}
				  <br>
				  <b>Fecha y Hora:</b> ${fech}
				  <br>
				  <b>Direccion IP:</b> ${ip}
				  <br>
				  <b>Pais:</b> ${pais}`
			  };
			  transporter.sendMail(recibir_transmitir,(err, info) => {
				  if(err)
					  console.log(err)
				  else
					  console.log(info);
				  })
  })
});


router.get('/',(req,res)=>{
	res.render('index.ejs',{ct:{},
	GOOGLE_RECAPTCHA:process.env.GOOGLE_RECAPTCHA})	
});


module.exports = router;