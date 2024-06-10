"use strict";
const express = require("express");
var mongoose = require("mongoose");
const router = express.Router();
var jwt = require("jsonwebtoken");
var bcrypt = require("bcryptjs");
const { MongoClient } = require("mongodb");
const client = new MongoClient(process.env.DATABASE_URL);
User = mongoose.model("User");

const verifyToken = (req, res, next) => {
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
      await client.db("urlShortener").collection("Users").insertOne(newUser);

      return res.status(200).json({
        status: 200,
        message: "Registration Successful.",
        token: jwt.sign(
          {
            email: req.body.email,
            _id: newUser._id,
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

module.exports = router;
