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
    res.status(401).send("Authentication Required.");
    return;
  }
  jwt.verify(token, `${process.env.SECRET_KEY}`, (err, decoded) => {
    if (err) {
      res.status(403).send("Invalid token.");
      return;
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
      token: jwt.sign(
        {
          email: result.email,
          _id: result._id,
        },
        `${process.env.SECRET_KEY}`
      ),
    });
  } catch (err) {
    return res.status(400).json({
      status: 400,
      message: err,
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
    return res.status(400).json({
      status: 400,
      message: err,
    });
  }
});

// Link CRUD endpoints
// Create a new short URL
router.post('/shorten', async (req, res) => {
  const { originalUrl, userID } = req.body;
  const url = new Url({ originalUrl, userID });
  await client.db("urlShortener").collection("Links").insertOne(url);

  return res.status(200).json({
    status: 200,
    message: "Short link created successfuly."
  });
});

// Read a URL by short URL
router.get('/:shortUrl', async (req, res) => {
  const { shortUrl } = req.params;

  try {
    const url = await client.findOneAndUpdate(
      { shortUrl },
      { $inc: { clicks: 1 } },
      { new: true }
    );
    
    if (url) {
      res.redirect(url.originalUrl);
    } else {
      return res.status(404).json({
        status: 404,
        message: 'URL not found.'
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: 500,
      message: 'Server error.'
    });
  }
});

// Update a URL
router.put('/:shortUrl', async (req, res) => {
  const { shortUrl } = req.params;
  const { originalUrl } = req.body;
  const url = await Url.findOneAndUpdate({ shortUrl }, { originalUrl }, { new: true });
  if (url) {
    res.json(url);
  } else {
    res.status(404).json('URL not found');
  }
});

// Delete a URL
router.delete('/:shortUrl', async (req, res) => {
  const { shortUrl } = req.params;
  const url = await Url.findOneAndDelete({ shortUrl });
  if (url) {
    res.json('URL deleted');
  } else {
    res.status(404).json('URL not found');
  }
});

module.exports = router;
