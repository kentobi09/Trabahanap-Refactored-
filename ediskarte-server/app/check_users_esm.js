import { MongoClient } from "mongodb";

async function run() {
  const client = new MongoClient("mongodb://127.0.0.1:27017/ediskarte?directConnection=true");
  await client.connect();
  const db = client.db("ediskarte");
  
  const users = await db.collection("users").find({}).toArray();
  console.log("=== USERS ===");
  users.forEach(u => {
    console.log(`ID: ${u._id || u.id}, Name: ${u.firstName} ${u.lastName}, Email: ${u.emailAddress}, Type: ${u.userType}`);
  });

  const applicants = await db.collection("applicants").find({}).toArray();
  console.log("=== APPLICANTS ===");
  applicants.forEach(a => {
    console.log(`ID: ${a._id || a.id}, Name: ${a.firstName} ${a.lastName}, Status: ${a.verification_status || a.verificationStatus}`);
  });

  await client.close();
}
run();
