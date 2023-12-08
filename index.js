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

//app.use(cors());
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
    console.log("email: ", email, "password: ", password);
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
    console.log("email: ", email, "password: ", password);
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
    console.log("flight: ", flight);
    console.log("jwtTokenxxxx000000000000000000000000000000000000000000000: ", jwtToken);
//    console.log("phoneNumberxxxx: ", phoneNumber);
    await userService.paymentforflight(db,flight, jwtToken, phoneNumber);

//    console.log('response:', response);
    
    res.status(200).json({ success: true, message: 'success.' });
  
  } catch (error) {
    console.error('Error handling the request:', error);
    res.status(500).json({ success: false, error: 'Internal server error.' });
  }

});

/*app.post('/nodejs/darajaApi', async(req, res) => {
  try {
    console.log("DarajApi!");

    let unirest = require('unirest');
    console.log("DarajApi2!");
    let req = unirest('GET', 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials')
    .headers({ 'Authorization': 'Bearer cFJZcjZ6anEwaThMMXp6d1FETUxwWkIzeVBDa2hNc2M6UmYyMkJmWm9nMHFRR2xWOQ==' })
    .send()
    .end(res => {
      if (res.error) throw new Error(res.error);
      console.log("res.raw_body: ", res.raw_body);
    });  
  } catch (error) {
    // Handle errors and respond with an error message
    res.status(500).json({ success: false, error: error.message });
  }

});*/

app.get('/nodejs/darajaApi/register', (request, res) => {

  console.log("yes yres 1");
    let unirest = require('unirest');
    let req = unirest('POST', 'https://sandbox.safaricom.co.ke/mpesa/c2b/v1/registerurl')
    .headers({
      'Content-Type': 'application/json',
      'Authorization': 'Bearer oANnWSGHJ7ZzrTjFvjYXi22VGTK4'
    })

    
    .send(JSON.stringify({
      "ShortCode": 600992,
    "ResponseType": "Completed",
    "ConfirmationURL": "http://192.168.100.3:3000/confirmation",
    "ValidationURL": "http://192.168.100.3:3000/validation"
    }))
    .end(res => {
      if (res.error) throw new Error(res.error);
      console.log("res.raw_body: ",res.raw_body);
    });

});

app.get('/nodejs/getFlightReservations', async (request, res) => {
  try {
    
  const jwtToken  = request.headers.authorization.split(' ')[1];
  console.log("jwtTokenxxxx: ", jwtToken);
  const response = await userService.getAllFlightReservations(db, jwtToken);

  console.log('response:', response);


    res.status(200).json({ success: true, message: 'success', data: response });
  } catch (error) {
    console.error('Error handling the request:', error);
    res.status(500).json({ success: false, error: 'Internal server error.' });
  }
});

app.post('/nodejs/getUserEmail', async(req, res) => {
  try {
    
    const {token} = req.body;
    console.log("jwtTokenxxxx: ", token);

    const response = await userService.getUserEmailFromJwt(db, token);
    
    console.log('response:', response);


    res.status(200).json({ success: true, message: 'success', data: response });
  } catch (error) {
    console.error('Error handling the request:', error);
    res.status(500).json({ success: false, error: 'Internal server error.' });
  }
});

app.post('/nodejs/logout', async(req, res) => {
  try {
    
    const {jwtToken} = req.body;
    console.log("jwtTokenxxxx: ", jwtToken);

    const response = await userService.logout(db, jwtToken);
    
    console.log('response:', response);

    res.status(200).json({ success: true, message: 'success'});
  } catch (error) {
    console.error('Error handling the request:', error);
    res.status(500).json({ success: false, error: 'Internal server error.' });
  }
});



app.get('/nodejs/darajaApi/simulate', (request, res) => {
  
  console.log("yes 2, yes 2");
  
  let unirest = require('unirest');
  let req = unirest('POST', 'https://sandbox.safaricom.co.ke/mpesa/c2b/v1/simulate')
  
  .headers({
    'Content-Type': 'application/json',
    'Authorization': 'Bearer oANnWSGHJ7ZzrTjFvjYXi22VGTK4'
  })
  .send(JSON.stringify({


    
      "ShortCode":600584,
      "CommandID":"CustomerPayBillOnline",
      "Amount":10,
      "Msisdn": 254708374149,
      "BillRefNumber":"null"
  
  }))
  .end(res => {
    if (res.error) throw new Error(res.error);
    console.log("res: ", res);
    console.log("res.raw_body: ", res.raw_body);
});

});


/*

Headers
Key: Authorization
Value: Basic cFJZcjZ6anEwaThMMXp6d1FETUxwWkIzeVBDa2hNc2M6UmYyMkJmWm9nMHFRR2xWOQ==
​
Body
  {
    "ShortCode": 600989,
    "ResponseType": "Completed",
    "ConfirmationURL": "http://192.168.100.4/confirmation",
    "ValidationURL": "http://192.168.100.4/validation"
  }
*/

app.post('/confirmation', (request, res) => {
  console.log("......Confirmation......");
  console.log(request.body);
})

app.post('/validation', (request, res) => {
  console.log("......Validation......");
  console.log(request.body);
})


const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
