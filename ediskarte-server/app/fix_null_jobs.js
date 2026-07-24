import { MongoClient } from "mongodb";

async function fixNulls() {
  const client = new MongoClient("mongodb://127.0.0.1:27017/ediskarte?directConnection=true");
  await client.connect();
  const db = client.db("ediskarte");
  const result = await db.collection("jobrequest").updateMany(
    { $or: [{ jobDescription: null }, { jobDescription: { $exists: false } }] },
    { $set: { jobDescription: "" } }
  );
  console.log("Updated null jobDescription documents:", result);
  await client.close();
}

fixNulls();
