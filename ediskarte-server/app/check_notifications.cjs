const { MongoClient } = require("mongodb");

async function run() {
  const mongoUri = "mongodb://127.0.0.1:27017/ediskarte?directConnection=true";
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db("ediskarte");

  const notifications = await db.collection("notifications").find({}).toArray();
  console.log("All notifications:", notifications.map(n => ({
    id: n._id.toString(),
    clientId: n.clientId,
    jobSeekerId: n.jobSeekerId,
    notificationType: n.notificationType,
    notificationTitle: n.notificationTitle,
    notificationMessage: n.notificationMessage,
    isRead: n.isRead,
    createdAt: n.createdAt
  })));

  await client.close();
}
run().catch(console.error);
