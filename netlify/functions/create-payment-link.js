// netlify/functions/initiate-easebuzz.js
const crypto = require('crypto');
const fetch = require('node-fetch'); // npm install node-fetch@2
const querystring = require('querystring');

exports.handler = async (event, context) => {
if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*", // or restrict to "http://localhost:4200"
        "Access-Control-Allow-Headers": "Content-Type, Referer",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: "Preflight OK",
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' };
  }

  try {
    // const data = JSON.parse(event.body);
    const data = querystring.parse(event.body);

    // Env variables
    const MERCHANT_KEY = process.env.MERCHANT_KEY;
    const SALT = process.env.SALT;
    const REFERER = 'https://lumiradiamonds.in';

    if (!MERCHANT_KEY || !SALT) {
      return { statusCode: 500, headers: corsHeaders, body: 'Missing MERCHANT_KEY or SALT in env' };
    }

    // Fill missing udf fields if undefined
    for (let i = 1; i <= 10; i++) {
      if (!data[`udf${i}`]) data[`udf${i}`] = '';
    }

    // Generate hash (same as Python)
    const hashSequence = [
      'key','txnid','amount','productinfo','name','email',
      'udf1','udf2','udf3','udf4','udf5','udf6','udf7','udf8','udf9','udf10'
    ];

    let hashString = '';
    for (const key of hashSequence) {
      if (key === 'key') hashString += MERCHANT_KEY + '|';
      else hashString += (data[key] || '') + '|';
    }
    hashString += SALT;

    const hash = crypto.createHash('sha512').update(hashString).digest('hex').toLowerCase();

    // Build payload
    const payload = {
      key: MERCHANT_KEY,
      txnid: data.txnid,
      amount: data.amount,
      firstname: data.name,
      email: data.email,
      phone: data.phone,
      productinfo: data.productinfo,
      surl: data.surl,
      furl: data.furl,
      hash,
      ...data, // includes udf1-udf10 and any other extra fields
    };

    console.log('Payload being sent:', payload);

    const callUrl = 'https://pay.easebuzz.in/payment/initiateLink/';

    const response = await fetch(callUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': REFERER,
      },
      body: querystring.stringify(payload),
    });

    let respJson;
    try {
      respJson = await response.json();
    } catch (err) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Failed to parse JSON', raw: await response.text() }),
      };
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(respJson),
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
