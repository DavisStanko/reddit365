const https = require('https');
https.get('https://www.reddit.com/r/popular/hot.json?raw_json=1', {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
  }
}, (res) => {
  console.log('Status:', res.statusCode);
  res.on('data', d => console.log(d.toString().slice(0, 100)));
});
