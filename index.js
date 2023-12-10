// server.js
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const pgp = require('pg-promise')();
const bcrypt = require('bcrypt');
const unirest = require('unirest');


const corsOptions = {
  origin: 'http://192.168.100.3:8081',
  
};

app.use(cors(corsOptions));
const userService = require('./src/services/userService');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


// Configure your PostgreSQL connection details here
const db = pgp({
  user: 'postgres',
  host: 'localhost',
  database: 'airline',
  password: 'Melvin',
  port: 5432,
});


app.post('/nodejs/signup', async(req, res) => {
  try {
    
    const { email, password } = req.body;

    const user = await userService.createUser(db, email, password);

    console.log('User registered successfully:', user);
    
    res.status(201).json({ success: true, user });
  
  } catch (error) {
    // Handle errors and respond with an error message
    res.status(500).json({ success: false, error: error.message });
  }

});


app.post('/nodejs/login', async(req, res) => {
  try {
    
    const { email, password } = req.body;

    const user = await userService.login(db, email, password);

    console.log('User login successfully:', user);
    
    res.status(201).json({ success: true, user });
  
  } catch (error) {
    // Handle errors and respond with an error message
    res.status(500).json({ success: false, error: error.message });
  }

});


app.post('/nodejs/paymentforflight', async(req, res) => {
  try { 
    const { flight, jwtToken, phoneNumber} = req.body;

    await userService.paymentforflight(db,flight, jwtToken, phoneNumber);

    res.status(200).json({ success: true, message: 'success.' });
  
  } catch (error) {
    console.error('Error handling the request:', error);
    res.status(500).json({ success: false, error: 'Internal server error.' });
  }

});


app.get('/nodejs/getFlightReservations', async (request, res) => {
  try {
    
  const jwtToken  = request.headers.authorization.split(' ')[1];
  
  const response = await userService.getAllFlightReservations(db, jwtToken);
  
  res.status(200).json({ success: true, message: 'success', data: response });
  } catch (error) {
    console.error('Error handling the request:', error);
    res.status(500).json({ success: false, error: 'Internal server error.' });
  }
});


app.post('/nodejs/getUserEmail', async(req, res) => {
  try {
    
    const {token} = req.body;

    const response = await userService.getUserEmailFromJwt(db, token);
    
    res.status(200).json({ success: true, message: 'success', data: response });
  } catch (error) {
    console.error('Error handling the request:', error);
    res.status(500).json({ success: false, error: 'Internal server error.' });
  }
});


app.post('/nodejs/logout', async(req, res) => {
  try {    
    const {jwtToken} = req.body;

    const response = await userService.logout(db, jwtToken);

    res.status(200).json({ success: true, message: 'success'});
  } catch (error) {
    console.error('Error handling the request:', error);
    res.status(500).json({ success: false, error: 'Internal server error.' });
  }
});


const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
