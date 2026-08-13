const { MongoClient, ObjectId } = require("mongodb");

async function run() {
  const mongoUri = "mongodb://127.0.0.1:27017/ediskarte?directConnection=true";
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db("ediskarte");

  const posts = await db.collection("post").find({}).sort({ createdAt: -1 }).toArray();
  console.log("Total posts found:", posts.length);

  for (const post of posts) {
    console.log("Post:", {
      id: post._id.toString(),
      clientId: post.clientId,
      jobSeekerId: post.jobSeekerId,
      postContent: post.postContent
    });

    let author = null;
    if (post.clientId) {
      const clientUser = await db.collection("users").findOne({ _id: post.clientId });
      console.log("Resolved clientUser:", clientUser ? `${clientUser.firstName} ${clientUser.lastName}` : "Not found");
    } else if (post.jobSeekerId) {
      console.log("Querying jobseekers with:", post.jobSeekerId);
      const jobSeeker = await db.collection("jobseekers").findOne({ _id: post.jobSeekerId });
      console.log("Resolved jobSeeker:", jobSeeker);
      if (jobSeeker) {
        const seekerUser = await db.collection("users").findOne({ _id: jobSeeker.userId });
        console.log("Resolved seekerUser:", seekerUser ? `${seekerUser.firstName} ${seekerUser.lastName}` : "Not found");
      }
    }
  }

  await client.close();
}
run().catch(console.error);
