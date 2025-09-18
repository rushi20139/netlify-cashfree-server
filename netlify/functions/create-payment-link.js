// netlify/functions/initiate-easebuzz-payment.js

const crypto = require('crypto');
const fetch = require('node-fetch'); // Netlify doesn’t have fetch in Node 14/16 runtime by default

exports.handler = async (event, context) => {
  // ✅ CORS headers
  const ALLOWED_ORIGIN = '*'; // Change to your domain in prod
  const corsHeaders = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // ✅ Handle preflight request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: 'OK',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const body = JSON.parse(event.body);

    // ✅ From frontend
    const {
      txnid,
      amount,
      firstname,
      email,
      phone,
      productinfo,
      success_url,
      failure_url,
      udf1 = '',
      udf2 = '',
      udf3 = '',
      udf4 = '',
      udf5 = '',
    } = body;

    // ✅ From environment
    const key = process.env.EASEBUZZ_KEY;
    const salt = process.env.EASEBUZZ_SALT;
    const initiateUrl = process.env.EASEBUZZ_INITIATE_URL; 
    // Example: https://testpay.easebuzz.in/payment/initiateLink

    if (!key || !salt || !initiateUrl) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Server config error: missing key/salt/url' }),
      };
    }

    // ✅ Build hash
    const hashString = [
      key,
      txnid,
      amount,
      productinfo,
      firstname,
      email,
      udf1,
      udf2,
      udf3,
      udf4,
      udf5,
      salt,
    ].join('|');

    const hash = crypto.createHash('sha512')
      .update(hashString)
      .digest('hex');

    // ✅ Payload for Easebuzz
    const payload = {
      key,
      txnid,
      amount,
      firstname,
      email,
      phone,
      productinfo,
      success_url,
      failure_url,
      udf1,
      udf2,
      udf3,
      udf4,
      udf5,
      hash,
    };

    // ✅ Server-to-server call
    const response = await fetch(initiateUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const respJson = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Easebuzz error', details: respJson }),
      };
    }

    // ✅ Success response
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ success: true, data: respJson }),
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
