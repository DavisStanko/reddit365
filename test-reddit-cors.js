fetch("https://api.reddit.com/r/popular/hot.json?raw_json=1", {
  headers: {
    "Origin": "http://localhost:3000",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
  }
}).then(async r => {
  console.log("Status:", r.status);
  console.log("CORS Header:", r.headers.get("access-control-allow-origin"));
}).catch(e => console.error(e));
