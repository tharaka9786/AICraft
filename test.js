const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth-check',
  method: 'GET',
  headers: {
    'Authorization': 'aicraft_12@'
  }
};

const req = http.request(options, res => {
  console.log(`statusCode: ${res.statusCode}`);
  res.on('data', d => process.stdout.write(d));
});

req.on('error', error => console.error(error));
req.end();
