const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Function to create a new user
const createUser = async (db, email, password) => {
  try {
    console.log("result");
    // Check if the email already exists in the database
    const result = await db.oneOrNone('SELECT * FROM users WHERE useremail = $1', email);
    console.log("result", result);

    if (result) {
      console.log('Email already in use');
      throw new Error('Email already in use');
    }

    // Hash the password before storing it in the database
    const hashedPassword = await bcrypt.hash(password, 10); // 10 is the salt round
    console.log("email2: ", email, "password2: ", password);
    

    // Insert the new user into the database
    const newUser = await db.one('INSERT INTO users (useremail, userpassword) VALUES($1, $2) RETURNING userid, useremail', [
      email,
      hashedPassword,
    ]);

    return newUser;
  } catch (error) {
    throw error;
  }
};

const login = async (db, email, password) => {
  try {
    // Check if the email exists in the database
    const user = await db.oneOrNone('SELECT * FROM users WHERE useremail = $1', email);

    if (!user) {
      throw new Error('User not found');
    }

    // Verify the password
    const isPasswordValid = await bcrypt.compare(password, user.userpassword);

    if (!isPasswordValid) {
      throw new Error('Invalid password');
    }

    // Generate a JWT token without an expiration time
    const token = jwt.sign(
      { userid: user.userid, useremail: user.useremail },
      'your-secret-key', // Replace with your own secret key
    );

    // Store the JWT token in the user's row in the database
    await db.none('UPDATE users SET userjwt = $1 WHERE userid = $2', [token, user.userid]);


    // Return the user ID and email if login is successful
    return { userid: user.userid, useremail: user.useremail, userjwt: token };
  } catch (error) {
    throw error;
  }
};

const paymentforflight = async (db, flight, jwtToken, phoneNumber) => {
  try {
    console.log("result");
    console.log("flight 2!!!");
    console.log("jwtTokenzzzzz: ", jwtToken);
    console.log("phoneNumberzzzzz: ", phoneNumber);
    
//   await simulatePayment("vJzaoO2pg2iuYlMu4eeXslrenluO", flight, db, jwtToken, phoneNumber);

    let unirest = require('unirest');
    let req = unirest('GET', 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials')
    .headers({ 'Authorization': 'Basic cFJZcjZ6anEwaThMMXp6d1FETUxwWkIzeVBDa2hNc2M6UmYyMkJmWm9nMHFRR2xWOQ==' })
    .send()
    .end(async res => {
      if (res.error) throw new Error(res.error);
      console.log(res.raw_body);
      await simulatePayment(JSON.parse(res.raw_body).access_token, flight, db, jwtToken, phoneNumber);
    });
//Basic + token in nodejs code



  } catch (error) {
    throw error;
  }
};


async function getAllFlightReservations(db, jwtToken) {
  console.log("jwtToken", jwtToken);
  try {

    const userId = await getUserIdFromJwt(db, jwtToken);
    console.log("userId", userId);
    
    const data = await db.any('SELECT * FROM flightreservations WHERE fl_userid = $1', [userId]);
    return data;
  } catch (error) {
    throw error;
  }
}

async function getUserDetails(db, jwtToken) {
  try {

    const userId = await getUserIdFromJwt(db, jwtToken);
    console.log("userId", userId);
    
    const data = await db.any('SELECT * FROM flightreservations WHERE fl_userid = $1', [userId]);
    return data;
  } catch (error) {
    throw error;
  }
}



const simulatePayment = async (access_token, flight, db, jwtToken, phoneNumber) => {
  let response;
  try {
    console.log("result 3");
    console.log("flight 3!!!")
    console.log("access_token:",access_token)
    console.log("jwtTokenyyyyy:", jwtToken)
    
    let unirest = require('unirest');
    let req = unirest('POST', 'https://sandbox.safaricom.co.ke/mpesa/c2b/v1/simulate')
    .headers({
      'Content-Type': 'application/json',
      'Authorization': 'Bearer '+ access_token,
    })
    .send(JSON.stringify({
      "ShortCode": 600998,
      "CommandID": "CustomerBuyGoodsOnline",
      "Amount": 1,
      "Msisdn": 254708374149,
      "BillRefNumber": "null"
    }))
    .end(res => {
      if (res.error) throw new Error(res.error);
      console.log("res.raw_body 3:", res.raw_body);

      if(JSON.parse(res.raw_body).ResponseDescription === "Accept the service request successfully."){
        console.log("res.raw_body 4");
        saveFlightReservation(flight, db, jwtToken, phoneNumber, JSON.parse(res.raw_body).OriginatorCoversationID);
      }
    });

//    saveFlightReservation(flight, db, jwtToken, phoneNumber, "92979-47176841-3");

  } catch (error) {
    throw error;
  }
};


const saveFlightReservation =  async (flight, db, jwtToken, phoneNumber, OriginatorCoversationID) => {
  try {

    let FlightSegmentsTwoLegs, originStationCodeTwo, destinationStationCodeTwo, departureDateTimeTwo, arrivalDateTimeTwo, classOfServiceTwo, equipmentIdTwo, flightNumberTwo, distanceInKMTwo, logoUrlTwo, displayNameTwo, flightspurchaseLinks, currency, totalPrice, totalPricePerPassenger;

    
    console.log("flight:", flight);
    console.log("jwtTokenxxxxxxxxxxxxxx:", jwtToken);


    const flightsSegments = flight.segments;
    const FlightSegmentsOneLegs = flightsSegments[0].legs;
    console.log('FlightSegmentsOneLegs:', FlightSegmentsOneLegs);
    const originStationCodeOne = FlightSegmentsOneLegs[0].originStationCode;
    console.log('originStationCodeOne:', originStationCodeOne);
    const destinationStationCodeOne = FlightSegmentsOneLegs[0].destinationStationCode;
    console.log("destinationStationCodeOne:", destinationStationCodeOne);
    const departureDateTimeOne = FlightSegmentsOneLegs[0].departureDateTime;
    console.log("departureDateTimeOne:", departureDateTimeOne);
    const arrivalDateTimeOne = FlightSegmentsOneLegs[0].arrivalDateTime;
    console.log("arrivalDateTimeOne:", arrivalDateTimeOne);
  
    const classOfServiceOne = FlightSegmentsOneLegs[0].classOfService;
    console.log("classOfServiceOne:", classOfServiceOne);
    const equipmentIdOne = FlightSegmentsOneLegs[0].equipmentId;
    console.log("equipmentIdOne:", equipmentIdOne);    
    const flightNumberOne = FlightSegmentsOneLegs[0].flightNumber;
    console.log("flightNumberOne:", flightNumberOne);    
    const distanceInKMOne = FlightSegmentsOneLegs[0].distanceInKM;
    console.log("distanceInKMOne:", distanceInKMOne);    
    const logoUrlOne = FlightSegmentsOneLegs[0].operatingCarrier.logoUrl;
    console.log("logoUrlOne:", logoUrlOne);    
    const displayNameOne = FlightSegmentsOneLegs[0].operatingCarrier.displayName;
    console.log("displayNameOne:", displayNameOne);    

    console.log("flightsSegments[1]:", flightsSegments[1]);    
    console.log("flightsSegments[1]:", flightsSegments[1] != null);    

    if(flightsSegments[1] != null){
      FlightSegmentsTwoLegs = flightsSegments[1].legs;
      console.log('FlightSegmentsTwoLegs:', FlightSegmentsTwoLegs);
      originStationCodeTwo = FlightSegmentsTwoLegs[0].originStationCode;
      console.log('originStationCodeTwo:', originStationCodeTwo);
      destinationStationCodeTwo = FlightSegmentsTwoLegs[0].destinationStationCode;
      console.log("destinationStationCodeTwo:", destinationStationCodeTwo);
      departureDateTimeTwo = FlightSegmentsTwoLegs[0].departureDateTime;
      console.log("departureDateTimeTwo:", departureDateTimeTwo);
      arrivalDateTimeTwo = FlightSegmentsTwoLegs[0].arrivalDateTime;
      console.log("arrivalDateTimeTwo:", arrivalDateTimeTwo);
    
      classOfServiceTwo = FlightSegmentsTwoLegs[0].classOfService;
      console.log("classOfServiceTwo:", classOfServiceTwo);
      equipmentIdTwo = FlightSegmentsTwoLegs[0].equipmentId;
      console.log("equipmentIdTwo:", equipmentIdTwo);    
      flightNumberTwo = FlightSegmentsTwoLegs[0].flightNumber;
      console.log("flightNumberTwo:", flightNumberTwo);    
      distanceInKMTwo = FlightSegmentsTwoLegs[0].distanceInKM;
      console.log("distanceInKMTwo:", distanceInKMTwo);
      logoUrlTwo = FlightSegmentsTwoLegs[0].operatingCarrier.logoUrl;
      console.log("logoUrlTwo:", logoUrlTwo);    
      displayNameTwo = FlightSegmentsTwoLegs[0].operatingCarrier.displayName;
      console.log("displayNameTwo:", displayNameTwo);    
           
      flightspurchaseLinks = flight.purchaseLinks;
      currency = flightspurchaseLinks[0].currency;
      console.log("currency:", currency);   
      totalPrice = flightspurchaseLinks[0].totalPrice;
      console.log("totalPrice:", totalPrice);   
      totalPricePerPassenger = flightspurchaseLinks[0].totalPricePerPassenger;
      console.log("totalPricePerPassenger:", totalPricePerPassenger);
      console.log(" ");   
    }


    const userId = await getUserIdFromJwt(db, jwtToken);
    console.log("userId", userId);

    const insertedRow = await db.one(`
    INSERT INTO flightreservations (
      originstationcodeone, destinationstationcodeone, departuredatetimeone,
      arrivaldatetimeone, classofserviceone, equipmentidone, flightnumberone,
      distanceinkmone, originstationcodetwo, destinationstationcodetwo,
      departuredatetimetwo, arrivaldatetimetwo, classofservicetwo,
      equipmentidtwo, flightnumbertwo, distanceinkmtwo, currency,
      totalprice, totalpriceperpassenger, fl_userid, displaynameone, displaynametwo, logourlone,logourltwo, userphonenumber, originatorconversationid
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)
    RETURNING fl_id
  `, [
    originStationCodeOne, destinationStationCodeOne, departureDateTimeOne,
    arrivalDateTimeOne, classOfServiceOne, equipmentIdOne, flightNumberOne,
    distanceInKMOne, originStationCodeTwo, destinationStationCodeTwo,
    departureDateTimeTwo, arrivalDateTimeTwo, classOfServiceTwo,
    equipmentIdTwo, flightNumberTwo, distanceInKMTwo, currency,
    totalPrice, totalPricePerPassenger, userId, displayNameOne, displayNameTwo, logoUrlOne, logoUrlTwo, phoneNumber, OriginatorCoversationID  
  ]);
  console.log("Data inserted successfully with ID 1:", insertedRow);
  console.log("Data inserted successfully with ID:", insertedRow.id);
  return "Success";
    
  

  } catch (error) {
    throw error;
  }
};

const getUserIdFromJwt = async (db, jwtToken) => {
  try {
    // Decode the JWT token to get user information
    console.log("decodedToken 1:", jwtToken);
    const decodedToken = jwt.verify(jwtToken, 'your-secret-key'); // Replace with your own secret key
    console.log("decodedToken 2:", decodedToken);
    console.log("decodedToken.userid 2:", decodedToken.userid);


    return decodedToken.userid;
  } catch (error) {
    throw error;
  }
};

const getUserEmailFromJwt = async (db, jwtToken) => {
  try {
    // Decode the JWT token to get user information
    console.log("decodedToken 1:", jwtToken);
    const decodedToken = jwt.verify(jwtToken, 'your-secret-key'); // Replace with your own secret key
    console.log("decodedToken 2:", decodedToken);
    console.log("decodedToken.userid 2:", decodedToken.useremail);


    return decodedToken.useremail;
  } catch (error) {
    throw error;
  }
};


const logout = async (db, jwtToken) => {
  try {
    // Decode the JWT token to get user information
    console.log("decodedToken 1:", jwtToken);

    const userId = await getUserIdFromJwt(db, jwtToken);
    console.log("userId", userId);

    await db.none('UPDATE users SET userjwt = NULL WHERE userid = $1', [userId]);



    return "Success";
  } catch (error) {
    throw error;
  }
};


module.exports = {
  createUser, login, paymentforflight, getAllFlightReservations, getUserEmailFromJwt, logout, 
};
