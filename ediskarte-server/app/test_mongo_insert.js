import { MongoClient } from "mongodb";

async function test() {
  const client = new MongoClient("mongodb://127.0.0.1:27017/ediskarte?directConnection=true");
  await client.connect();
  const db = client.db("ediskarte");
  const result = await db.collection("applicants").insertOne({
    firstName: "Test",
    lastName: "User",
    emailAddress: "test@example.com",
    verificationStatus: "pending",
    joinedAt: new Date()
  });
  console.log("Insert result:", result);
  await client.close();
}

test();
