const express = require("express");
var cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");
bodyParser = require("body-parser");
jsonwebtoken = require("jsonwebtoken");
User = require("./models/user");
Url = require("./models/url");

const uri = process.env.DATABASE_URL;
const routes = require("./routes/routes");
const app = express();
const port = 5500;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("urlShortener").command({ ping: 1 });
    console.log("Connected to database.");
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}
run().catch(console.dir);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.json());
app.use(cors());
app.use("/api", routes);

app.listen(port, () => {
  console.log("Server Started.");
});
