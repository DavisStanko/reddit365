const https = require("https");

const url = "https://old.reddit.com/.json?limit=25&raw_json=1";

https.get(url, { headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" } }, (res) => {
  let data = "";
  res.on("data", (chunk) => data += chunk);
  res.on("end", () => {
    console.log("Status Code:", res.statusCode);
    if (res.statusCode !== 200) {
      console.log("Response Body:", data.slice(0, 500));
    } else {
      console.log("Success! Data length:", data.length);
    }
  });
}).on("error", (err) => {
  console.error("Error:", err.message);
});
