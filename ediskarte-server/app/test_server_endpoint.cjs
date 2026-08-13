const http = require("http");

http.get("http://127.0.0.1:3000/user/profile/6a62b6f2436d2c63a02d7baa/details", (res) => {
  let data = "";
  res.on("data", chunk => data += chunk);
  res.on("end", () => {
    console.log("Status Code:", res.statusCode);
    console.log("Response Body:", data);
  });
}).on("error", console.error);
