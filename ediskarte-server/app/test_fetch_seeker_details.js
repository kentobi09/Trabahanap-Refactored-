import "dotenv/config";
import { getJobSeekerProfileByUserId } from "./controllers/profile.controller.js";

async function run() {
  const req = {
    params: {
      jobSeekerId: "6a62b6f2436d2c63a02d7baa"
    }
  };
  const res = {
    json: function(data) {
      console.log("Details payload:", JSON.stringify(data, null, 2));
    },
    status: function(code) {
      console.log("Status code:", code);
      return this;
    }
  };

  await getJobSeekerProfileByUserId(req, res);
}
run().catch(console.error);
