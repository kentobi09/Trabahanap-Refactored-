import "dotenv/config";
import { searchJobSeekers } from "./controllers/app.controller.js";

async function run() {
  const req = {
    query: {
      query: "",
      category: "",
      page: "1",
      limit: "10"
    }
  };
  const res = {
    json: function(data) {
      console.log("Response data:", JSON.stringify(data, null, 2));
    },
    status: function(code) {
      console.log("Status code:", code);
      return this;
    }
  };

  await searchJobSeekers(req, res);
}
run().catch(console.error);
