const jwt = require("jsonwebtoken");
const http = require("http");

const secret = "43ffd4bcc4c6bc7b83fbed3c1cd450624a9e5cd6283089243f499cd3642926e2";
const token = jwt.sign(
  { id: "6a61bddc9cd6ca65789aacb5", userType: "client" },
  secret
);

const options = {
  hostname: "127.0.0.1",
  port: 3000,
  path: "/user/profile/6a62b6f2436d2c63a02d7baa/details",
  method: "GET",
  headers: {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json"
  }
};

const req = http.request(options, (res) => {
  let data = "";
  res.on("data", chunk => data += chunk);
  res.on("end", () => {
    console.log("Status Code:", res.statusCode);
    console.log("Response Body:");
    console.log(JSON.stringify(JSON.parse(data), null, 2));
  });
});

req.on("error", console.error);
req.end();
