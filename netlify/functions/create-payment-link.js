// netlify/functions/initiate-easebuzz-payment.js

const crypto = require('crypto');

// Handler
exports.handler = async (event, context) => {


  // Allowed origin for dev. Replace with your actual domains in production.
  const ALLOWED_ORIGIN = '*'; // or '*' for open dev
  const corsHeaders = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };


  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const body = JSON.parse(event.body);

    // From front-end
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
      udf5 = ''
    } = body;

    // From environment variables
    const key = process.env.EASEBUZZ_KEY;
    const salt = process.env.EASEBUZZ_SALT;
    const initiateUrl = process.env.EASEBUZZ_INITIATE_URL; 
      // e.g. "https://testpay.easebuzz.in/initiatePayment" or whatever Easebuzz requires

    if (!key || !salt || !initiateUrl) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Server configuration error: missing key/salt/url' }),
      };
    }

    // Build hash sequence: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5|salt
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
      salt
    ].join('|');

    const hash = crypto.createHash('sha512')
                       .update(hashString)
                       .digest('hex');

    // Prepare the payload as required by Easebuzz
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
      hash
    };

    // Make the server-to-server request to Easebuzz
    const response = await fetch(initiateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const respJson = await response.json();

    // Check Easebuzz response, extract payment link or access key etc.
    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: 'Easebuzz error', details: respJson }),
      };
    }

    // Assume the response gives something like { payment_link: "...", etc. } 
    // (You’ll have to check Easebuzz docs for the exact response field name.)
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, data: respJson }),
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
