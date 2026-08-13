const { MongoClient } = require("mongodb");

async function run() {
  const mongoUri = "mongodb://127.0.0.1:27017/ediskarte?directConnection=true";
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db("ediskarte");

  const r = await db.collection("reviews").findOne({});
  if (r) {
    console.log("reviewedId:", r.reviewedId, "constructor:", r.reviewedId.constructor.name, "type:", typeof r.reviewedId);
    console.log("reviewerId:", r.reviewerId, "constructor:", r.reviewerId.constructor.name, "type:", typeof r.reviewerId);
  } else {
    console.log("No reviews found");
  }

  await client.close();
}
run().catch(console.error);
