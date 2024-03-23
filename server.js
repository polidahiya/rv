const express = require("express");
const ObjectId = require("mongodb").ObjectId;
const mongoose = require("mongoose"); //install mongoose my command "npm i mongoose"
const { MongoClient } = require("mongodb");
const multer = require("multer");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const app = express();
app.use(cookieParser());
app.use(express.json());
app.listen(3005);
//
const bodyParser = require("body-parser");
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
//
app.use(express.static("./build"));

const db_link =process.env.mongolink;
mongoose.connect(db_link).then(async function () {
  const client = new MongoClient(db_link);
  await client.connect();
  const db = client.db("rvscienceclasses");
  const users = db.collection("users");
  const data = db.collection("data");

  console.log("listening");

  // get previewdata
  app.get("/data", async (req, res) => {
    try {
      // all visiters
      users.updateOne({}, { $inc: { totalvisits: 1 } }, { upsert: true });
      // today visiters
      // users.updateOne(
      //   { date: new Date().toISOString().split("T")[0] },
      //   { $inc: { visiterstoday: 1 } },
      //   { upsert: true }
      // );
      //
      let result = await data.findOne({});
      res.json(result);
    } catch (error) {
      console.log(error);
    }
  });
  // get admin data
  app.get("/admindata", verifyToken, async (req, res) => {
    try {
      let tvisiters = await users.findOne({});
      let result = await data.findOne({});
      result.totalvisiters = tvisiters.totalvisits;
      res.json(result);
    } catch (error) {
      console.log(error);
    }
  });
  // admin update1
  app.post("/update1", verifyToken, async (req, res) => {
    try {
      const filter = {};
      const update = { $set: req.body };
      data.updateOne(filter, update, { upsert: true });
      res.json({
        message: "true",
      });
    } catch (error) {
      console.log(error);
    }
  });
  // update2
  const storage = multer.memoryStorage();
  const upload = multer({
    storage: storage,
    limits: {
      fieldSize: 10 * 1024 * 1024,
      fileSize: 10 * 1024 * 1024,
    },
  });
  app.post("/update2", verifyToken, upload.single(), async (req, res) => {
    try {
      const formData = JSON.parse(req.body.data);
      const filter = {};
      const update = { $set: formData };
      data.updateOne(filter, update, { upsert: true });
      res.json({
        message: "true",
      });
    } catch (error) {
      console.log(error);
    }
  });
  //update password
  app.post("/updatepassword", async (req, res) => {
    try {
      users.findOne({ email: "admin@vishal.com" }).then((user) => {
        if (user.password == req.body.cpass) {
          users.updateOne(
            { email: "admin@vishal.com" },
            { $set: { password: req.body.npass } }
          );
          res.json({
            message: "passupdated",
          });
        } else {
          res.json({
            message: "wrongpass",
          });
        }
      });
    } catch (error) {
      console.log(error);
    }
  });
  //user verification
  //login
  app.post("/login", (req, res) => {
    try {
      users.findOne({ email: "admin@vishal.com" }).then((user) => {
        if (user) {
          if (user.password == req.body.password) {
            const token = jwt.sign(
              { userId: "admin@vishal.com" },
              "this-world-is-toxic",
              {
                expiresIn: "24h",
              }
            );
            res.cookie(`token`, token, {
              httpOnly: true,
              sameSite: "lax",
              maxAge: 24 * 60 * 60 * 1000, //one days
            });
            res.cookie(`logedin`, true, {
              sameSite: "lax",
              maxAge: 24 * 60 * 60 * 1000, //one days
            });
            res.status(200).json({ message: "true", token });
          } else {
            res.json({
              message: "Incorrect password",
            });
          }
        } else {
          res.json({
            message: "User not found",
          });
        }
      });
    } catch (error) {
      console.log(error);
    }
  });
  // logout
  app.get("/logout", (req, res) => {
    res.clearCookie("token");
    res.clearCookie("logedin");
    res.json({
      message: "logedout",
    });
  });
  // token verification

  function verifyToken(req, res, next) {
    //
    if (req.headers.cookie) {
      const cookiedata = req.headers.cookie;
      const cookiesArray = cookiedata.split(";");
      const cookiesobject = {};
      cookiesArray.forEach((cookie) => {
        const [key, value] = cookie.trim().split("=");
        cookiesobject[key] = value.replace(/%40/g, "@");
      });
      const token = cookiesobject.token;

      //
      if (token) {
        jwt.verify(token, "this-world-is-toxic", (err, decoded) => {
          if (err) {
            return res.json({ message: "Invalid token" });
          }
          req.email = decoded.userId;
          next();
        });
      } else {
        return res.json({ message: "Token not provided" });
      }
    } else {
      console.log("unlogined request");
      return res.json({ message: "Please login first" });
    }
  }
});
