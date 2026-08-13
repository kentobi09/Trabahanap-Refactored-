const jwt = require("jsonwebtoken");

async function run() {
  const secret = "43ffd4bcc4c6bc7b83fbed3c1cd450624a9e5cd6283089243f499cd3642926e2";
  const token = jwt.sign({ id: "6a62b6f2436d2c63a02d7baa", email: "juan@example.com" }, secret);

  const response = await fetch("http://127.0.0.1:3000/user/profile/6a62b6f2436d2c63a02d7baa/details", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  console.log("Status:", response.status);
  const data = await response.json();
  console.log("Response Body:", JSON.stringify(data, null, 2));
}
run().catch(console.error);
