const axios = require('axios');
const cheerio = require('cheerio');

async function test() {
  const res = await axios.get('https://ricette.giallozafferano.it/Pollo-alla-cacciatora.html');
  const $ = cheerio.load(res.data);
  const title = $('h1').text().trim();
  const image = $('picture img').attr('src');
  const ingredients = [];
  $('.gz-ingredient').each((i, el) => {
    const nome = $(el).find('a').text().trim() || $(el).contents().filter(function() { return this.nodeType === 3; }).text().trim();
    const quantita = $(el).find('span').text().trim();
    if(nome) ingredients.push({ nome, quantita });
  });
  const steps = [];
  $('.gz-content-recipe-step').each((i, el) => {
    steps.push($(el).text().trim());
  });
  console.log({ title, image, ingredients: ingredients.slice(0,3), stepsCount: steps.length });
}
test();
