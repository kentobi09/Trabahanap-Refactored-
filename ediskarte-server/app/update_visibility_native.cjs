const { MongoClient } = require("mongodb");

async function run() {
  const mongoUri = "mongodb://127.0.0.1:27017/ediskarte?directConnection=true";
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db("ediskarte");

  const result = await db.collection("users").updateMany(
    {},
    { $set: { phoneVisibility: "public" } }
  );

  console.log("Updated users count using native MongoDB:", result.modifiedCount);
  await client.close();
}
run().catch(console.error);
