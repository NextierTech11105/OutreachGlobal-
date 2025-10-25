const { bootstrap } = require('../apps/api/dist/main');

let app;

module.exports = async (req, res) => {
  // Set CORS headers for all requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle OPTIONS preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (!app) {
    app = await bootstrap();
  }

  // Convert Vercel request to Fastify-compatible format
  const response = await app.inject({
    method: req.method,
    url: req.url,
    headers: req.headers,
    payload: req.body,
  });

  // Set response headers
  Object.keys(response.headers).forEach(key => {
    res.setHeader(key, response.headers[key]);
  });

  // Set status and send body
  res.status(response.statusCode).send(response.payload);
};
