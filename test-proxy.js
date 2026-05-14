const http = require('http');
const https = require('https');

const req = https.request("https://old.reddit.com/r/popular.json?raw_json=1", {
  method: 'GET',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
  }
}, (res) => {
  console.log("Status:", res.statusCode);
  const chunks = [];
  res.on('data', d => chunks.push(d));
  res.on('end', () => {
    console.log(Buffer.concat(chunks).toString().slice(0, 100));
  });
});
req.on('error', console.error);
req.end();
