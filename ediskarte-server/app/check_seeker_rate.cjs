const { MongoClient } = require("mongodb");

async function run() {
  const mongoUri = "mongodb://127.0.0.1:27017/ediskarte?directConnection=true";
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db("ediskarte");

  const seekers = await db.collection("jobseekers").find({}).toArray();
  console.log("Job Seekers:", seekers.map(s => ({
    id: s._id.toString(),
    userId: s.userId?.toString(),
    hourlyRate: s.hourlyRate,
    rate: s.rate
  })));

  await client.close();
}
run().catch(console.error);
