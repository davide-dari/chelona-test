const https = require('https');
https.get("https://www.giallozafferano.it/ricette/Spaghetti-alla-Carbonara.html", { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const lines = data.split('\n');
    const ingredientLines = lines.filter(l => l.includes('ingredient'));
    console.log(ingredientLines.slice(0, 20).join('\n'));
  });
});
