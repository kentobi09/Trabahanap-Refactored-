const { MongoClient } = require("mongodb");

async function run() {
  const mongoUri = "mongodb://127.0.0.1:27017/ediskarte?directConnection=true";
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db("ediskarte");

  const collections = await db.listCollections().toArray();
  console.log("Collections:", collections.map(c => c.name));

  const jobseekersCount = await db.collection("jobseekers").countDocuments();
  const jobseekerCount = await db.collection("JobSeeker").countDocuments();
  console.log("jobseekers count:", jobseekersCount);
  console.log("JobSeeker count:", jobseekerCount);

  if (jobseekersCount > 0) {
    const js = await db.collection("jobseekers").findOne();
    console.log("Sample jobseekers doc:", js);
  }
  if (jobseekerCount > 0) {
    const js = await db.collection("JobSeeker").findOne();
    console.log("Sample JobSeeker doc:", js);
  }

  await client.close();
}
run().catch(console.error);
