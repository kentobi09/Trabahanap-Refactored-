const { MongoClient, ObjectId } = require("mongodb");

async function run() {
  const mongoUri = "mongodb://127.0.0.1:27017/ediskarte?directConnection=true";
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db("ediskarte");

  const reviews = await db.collection("reviews").find({}).toArray();
  console.log("All reviews in DB:", reviews.map(r => ({
    id: r._id.toString(),
    jobRequestId: r.jobRequestId?.toString(),
    reviewerId: r.reviewerId?.toString(),
    reviewedId: r.reviewedId?.toString(),
    rating: r.rating,
    feedback: r.feedback
  })));

  await client.close();
}
run().catch(console.error);
