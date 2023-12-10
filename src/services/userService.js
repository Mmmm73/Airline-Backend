const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');


const createUser = async (db, email, password) => {
  try {
    console.log("result");
    // Check if the email already exists
    const result = await db.oneOrNone('SELECT * FROM users WHERE useremail = $1', email);
    console.log("result", result);

    if (result) {
      console.log('Email already in use');
      throw new Error('Email already in use');
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10); // 10 is the salt round
    console.log("email2: ", email, "password2: ", password);
    
    // Insert the new user
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
    // Check if the email exists
    const user = await db.oneOrNone('SELECT * FROM users WHERE useremail = $1', email);

    if (!user) {
      throw new Error('User not found');
    }

    // Verify the password
    const isPasswordValid = await bcrypt.compare(password, user.userpassword);

    if (!isPasswordValid) {
      throw new Error('Invalid password');
    }

    // Generate a JWT token
    const token = jwt.sign(
      { userid: user.userid, useremail: user.useremail },
      'your-secret-key', 
    );

    // Store the JWT token
    await db.none('UPDATE users SET userjwt = $1 WHERE userid = $2', [token, user.userid]);


    // Return user ID and email if login is successful
    return { userid: user.userid, useremail: user.useremail, userjwt: token };
  } catch (error) {
    throw error;
  }
};

const paymentforflight = async (db, flight, jwtToken, phoneNumber) => {
  try {
    let unirest = require('unirest');

    let req = unirest('GET', 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials')
    .headers({ 'Authorization': 'Basic cFJZcjZ6anEwaThMMXp6d1FETUxwWkIzeVBDa2hNc2M6UmYyMkJmWm9nMHFRR2xWOQ==' })
    .send()
    .end(async res => {
      if (res.error) throw new Error(res.error);
      console.log(res.raw_body);
      await simulatePayment(JSON.parse(res.raw_body).access_token, flight, db, jwtToken, phoneNumber);
    });

  } catch (error) {
    throw error;
  }
};


async function getAllFlightReservations(db, jwtToken) {
  try {

    const userId = await getUserIdFromJwt(db, jwtToken);
    
    const data = await db.any('SELECT * FROM flightreservations WHERE fl_userid = $1', [userId]);
    return data;
  } catch (error) {
    throw error;
  }
}

async function getUserDetails(db, jwtToken) {
  try {

    const userId = await getUserIdFromJwt(db, jwtToken);
    
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

      if(JSON.parse(res.raw_body).ResponseDescription === "Accept the service request successfully."){
        saveFlightReservation(flight, db, jwtToken, phoneNumber, JSON.parse(res.raw_body).OriginatorCoversationID);
      }
    });

  } catch (error) {
    throw error;
  }
};


const saveFlightReservation =  async (flight, db, jwtToken, phoneNumber, OriginatorCoversationID) => {
  try {

    let FlightSegmentsTwoLegs, originStationCodeTwo, destinationStationCodeTwo, departureDateTimeTwo, arrivalDateTimeTwo, classOfServiceTwo, equipmentIdTwo, flightNumberTwo, distanceInKMTwo, logoUrlTwo, displayNameTwo, flightspurchaseLinks, currency, totalPrice, totalPricePerPassenger;

    const flightsSegments = flight.segments;
    const FlightSegmentsOneLegs = flightsSegments[0].legs;
    const originStationCodeOne = FlightSegmentsOneLegs[0].originStationCode;
    const destinationStationCodeOne = FlightSegmentsOneLegs[0].destinationStationCode;
    const departureDateTimeOne = FlightSegmentsOneLegs[0].departureDateTime;
    const arrivalDateTimeOne = FlightSegmentsOneLegs[0].arrivalDateTime;
  
    const classOfServiceOne = FlightSegmentsOneLegs[0].classOfService;
    const equipmentIdOne = FlightSegmentsOneLegs[0].equipmentId;
    const flightNumberOne = FlightSegmentsOneLegs[0].flightNumber;
    const distanceInKMOne = FlightSegmentsOneLegs[0].distanceInKM;
    const logoUrlOne = FlightSegmentsOneLegs[0].operatingCarrier.logoUrl;
    const displayNameOne = FlightSegmentsOneLegs[0].operatingCarrier.displayName;

    if(flightsSegments[1] != null){
      FlightSegmentsTwoLegs = flightsSegments[1].legs;
      originStationCodeTwo = FlightSegmentsTwoLegs[0].originStationCode;
      destinationStationCodeTwo = FlightSegmentsTwoLegs[0].destinationStationCode;
      departureDateTimeTwo = FlightSegmentsTwoLegs[0].departureDateTime;
      arrivalDateTimeTwo = FlightSegmentsTwoLegs[0].arrivalDateTime;
    
      classOfServiceTwo = FlightSegmentsTwoLegs[0].classOfService;
      equipmentIdTwo = FlightSegmentsTwoLegs[0].equipmentId;
      flightNumberTwo = FlightSegmentsTwoLegs[0].flightNumber;
      distanceInKMTwo = FlightSegmentsTwoLegs[0].distanceInKM;
      logoUrlTwo = FlightSegmentsTwoLegs[0].operatingCarrier.logoUrl;
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

  return "Success";    

  } catch (error) {
    throw error;
  }
};

const getUserIdFromJwt = async (db, jwtToken) => {
  try {

    const decodedToken = jwt.verify(jwtToken, 'your-secret-key'); 

    return decodedToken.userid;
  } catch (error) {
    throw error;
  }
};

const getUserEmailFromJwt = async (db, jwtToken) => {
  try {
    // Decode the JWT token
    const decodedToken = jwt.verify(jwtToken, 'your-secret-key');

    return decodedToken.useremail;
  } catch (error) {
    throw error;
  }
};


const logout = async (db, jwtToken) => {
  try {
    // Decode the JWT token
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
