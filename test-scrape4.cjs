const https = require('https');
const extractRecipes = (html) => {
  const recipes = [];
  const regex = /<article class="gz-card-recipe[^>]*>.*?<h2 class="gz-title"><a href="([^"]+)" title="([^"]+)">.*?<picture class="gz-card-image".*?<img.*?src="([^"]+)"/gs;
  let match;
  while ((match = regex.exec(html)) !== null) {
    recipes.push({ url: match[1], title: match[2], image: match[3] });
  }
  return recipes;
};
https.get("https://www.giallozafferano.it/ricette-cat/Primi/", { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(extractRecipes(data));
  });
});
