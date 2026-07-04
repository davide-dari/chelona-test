const https = require('https');
https.get('https://ricette.giallozafferano.it/Pollo-alla-cacciatora.html', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(data.substring(0, 500));
  });
}).on('error', console.error);
