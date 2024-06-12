"use strict";
const express = require("express");
var mongoose = require("mongoose");
const router = express.Router();
var jwt = require("jsonwebtoken");
var bcrypt = require("bcryptjs");
const { MongoClient } = require("mongodb");
const client = new MongoClient(process.env.DATABASE_URL);
User = mongoose.model("User");
Url = mongoose.model("Url");

const checkToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({
      status: 401,
      message: "Not Authorized."
    });
  }

  jwt.verify(token, `${process.env.SECRET_KEY}`, (error, decoded) => {
    if (error) {
      return res.status(403).json({
        status: 403,
        message: "Invalid Token."
      });
    }
    req.user = decoded;
    next();
  });
};

router.get("/", async (req, res) => {
  return res.send("Welcome to the URL Shortener API.");
})

// Authentication endpoints

router.post("/auth/login", async (req, res) => {
  const result = await client
    .db("urlShortener")
    .collection("Users")
    .findOne({ email: req.body.email });
  var correctPassword = undefined;

  try {
    if (result) {
      correctPassword = await bcrypt.compareSync(
        req.body.password,
        result.password
      );

      if (!correctPassword) {
        return res.status(401).json({
          status: 401,
          message: "Invalid email or password.",
        });
      }
    }
    return res.status(200).json({
      status: 200,
      message: "Login Successful.",
      profile: result._id,
      token: jwt.sign(
        {
          email: result.email,
          _id: result._id,
        },
        `${process.env.SECRET_KEY}`
      ),
    });
  } catch (err) {
    return res.status(500).json({
      status: 500,
      message: "Server error.",
    });
  }
});

router.post("/auth/register", async (req, res) => {
  var newUser = new User(req.body);
  newUser.password = bcrypt.hashSync(req.body.password, 10);

  const result = await client
    .db("urlShortener")
    .collection("Users")
    .findOne({ email: req.body.email });

  try {
    if (!result) {
      const response = await client.db("urlShortener").collection("Users").insertOne(newUser);

      return res.status(200).json({
        status: 200,
        message: "Registration Successful.",
        profile: response.insertedId,
        token: jwt.sign(
          {
            email: req.body.email,
            _id: response.insertedId,
          },
          `${process.env.SECRET_KEY}`
        ),
      });
    } else {
      return res.status(400).json({
        status: 400,
        message: "User already exists.",
      });
    }
  } catch (err) {
    return res.status(500).json({
      status: 500,
      message: "Server error.",
    });
  }
});

// Link CRUD endpoints

// Get all links according to users ID
router.post('/links', checkToken, async (req, res) => {
  try {
    const { userID } = await req.body;
    const links = client.db("urlShortener").collection("Links");
    const query = { userID: { $eq: userID } };
    const options = {
      sort: { clicks: -1 },
    };

    const result = links.find(query, options);

    if ((await links.countDocuments(query)) !== 0) {
      let temp = []
      for await (const link of result) {
        temp.push(link);
      }

      return res.status(200).json({
        status: 200,
        message: "Link fetch succesful.",
        data: temp
      });
    } else {
      return res.status(404).json({
        status: 404,
        message: 'No links found.'
      });
    }
  } catch (error) {
    return res.status(500).json({
      status: 500,
      message: 'Server error.'
    });
  }
});

// Create a new short URL
router.post('/shorten', checkToken, async (req, res) => {
  try {
    const { originalUrl, userID } = req.body;
    const url = new Url({ originalUrl, userID });
    await client.db("urlShortener").collection("Links").insertOne(url);

    return res.status(200).json({
      status: 200,
      message: "Short link created successfuly.",
      data: url
    });
  } catch (error) {
    return res.status(500).json({
      status: 500,
      message: 'Server error.'
    });
  }

});

// Read a short URL and redirect to the original URL
router.get('/:shortUrl', async (req, res) => {
  try {
    const { shortUrl } = req.params;

    const url = await client.db("urlShortener").collection("Links")
      .findOneAndUpdate(
        { shortUrl },
        { $inc: { clicks: 1 } },
        { new: true });

    if (url) {
      return res.redirect(url.originalUrl);
    } else {
      return res.status(404).json({
        status: 404,
        message: 'URL not found.'
      });
    }
  } catch (error) {
    return res.status(500).json({
      status: 500,
      message: 'Server error.'
    });
  }
});

// Update a URL
router.put('/:shortUrl', checkToken, async (req, res) => {
  const { shortUrl } = req.params;
  const { originalUrl } = req.body;
  const url = await client.db("urlShortener").collection("Links")
    .findOneAndUpdate({ shortUrl }, { $set: { originalUrl: originalUrl, modifiedDate: Date.now } }, { returnNewDocument: true });

  if (url) {
    res.status(200).json({
      status: 200,
      message: "URL updated successfuly.",
      data: url
    });
  } else {
    return res.status(404).json({
      status: 404,
      message: 'URL not found.'
    });
  }
});

// Delete a URL
router.delete('/:shortUrl', checkToken, async (req, res) => {
  const { shortUrl } = req.params;
  const url = await client.db("urlShortener").collection("Links")
    .findOneAndDelete({ shortUrl });

  if (url) {
    return res.status(200).json({
      status: 200,
      message: 'URL deleted successfuly.'
    });
  } else {
    return res.status(404).json({
      status: 404,
      message: 'URL not found.'
    });
  }
});

module.exports = router;
