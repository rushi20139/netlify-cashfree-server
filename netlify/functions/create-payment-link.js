// netlify/functions/create-payment-link.js
exports.handler = async (event, context) => {
  // Allowed origin for dev. Replace with your actual domains in production.
  const ALLOWED_ORIGIN = 'http://localhost:4200'; // or '*' for open dev
  const corsHeaders = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Respond to preflight OPTIONS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: ''
    };
  }

  // Only POST creates the link
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: 'Method Not Allowed'
    };
  }

  // Parse JSON
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (err) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { amount, name, email, phone, notes } = body;
  if (!amount || !email) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'amount and email required' }) };
  }

  const CF_BASE = process.env.CF_ENV === 'prod'
    ? 'https://api.cashfree.com/pg/links'
    : 'https://sandbox.cashfree.com/pg/links';

  const payload = {
    link_amount: Number(amount),
    link_currency: 'INR',
    link_purpose: 'Order Payment',
    customer_details: {
      customer_name: name || 'Customer',
      customer_email: email,
      customer_phone: phone || ''
    },
    link_notify: { send_email: true, send_sms: false },
    link_notes: notes || {}
  };

  try {
    const resp = await fetch(CF_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2025-01-01',
        'x-client-id': 'TEST10761818a7392f8673c71c52baa781816701',
        'x-client-secret': 'cfsk_ma_test_57a37761034a2f7af2777bebdc792d77_257b48cc'
      },
      body: JSON.stringify(payload)
    });

    const data = await resp.json();
    if (!resp.ok) {
      return { statusCode: resp.status || 502, headers: corsHeaders, body: JSON.stringify({ error: 'Cashfree API error', details: data }) };
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ link: data.link_url, link_id: data.link_id, raw: data })
    };
  } catch (err) {
    console.error('Function error', err);
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'server error', details: String(err) }) };
  }
};



// TEST10761818a7392f8673c71c52baa781816701
// cfsk_ma_test_57a37761034a2f7af2777bebdc792d77_257b48cc