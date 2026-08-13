const { MongoClient } = require("mongodb");

async function run() {
  const mongoUri = "mongodb://127.0.0.1:27017/ediskarte?directConnection=true";
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db("ediskarte");

  const users = await db.collection("users").find({ profileImage: { $ne: null } }).toArray();
  console.log("Users with profile images:", users.map(u => ({ name: u.firstName, img: u.profileImage })));

  await client.close();
}
run().catch(console.error);
