//jshint esversion:6

///////------ROUTINES-----//////
//requires
require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
//cookies -sessions
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");
//making app from express
const app = express();

mongoose.set("useCreateIndex", true);
//to set up ejs
app.set("view engine", "ejs");
//to use body-parser
app.use(bodyParser.urlencoded({ extended: true }));
//to add css to the web app and use it
app.use(express.static("public"));

//mogoose schema
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  secret: String,
});

//session
app.use(
  session({
    secret: "iloveu",
    resave: false,
    saveUninitialized: false,
  })
);

//passport
app.use(passport.initialize());
app.use(passport.session());

//userSchema as a plugin
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

//mongoose connect,model
mongoose.connect("mongodb://localhost:27017/userDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const User = new mongoose.model("User", userSchema);

//  passport-local-mongoose
passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
  done(null, user.id);
  // if you use Model.id as your idAttribute maybe you'd want
  // done(null, user.id);
});
passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});
//for local authentication==>
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "http://localhost:3001/auth/google/myFeed",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    function (accessToken, refreshToken, profile, cb) {
      User.findOrCreate({ googleId: profile.id }, function (err, user) {
        return cb(err, user);
      });
    }
  )
);

///////-----------//////

//GET REQUESTS
app.get("/", function (req, res) {
  res.render("home");
});

app.get("/login", function (req, res) {
  res.render("login");
});

app.get("/register", function (req, res) {
  res.render("register");
});

//listetning to port 3000
app.listen(3001, function () {
  console.log("server started on port 3001");
});

app.get("/secrets", function (req, res) {
  User.find({ secret: { $ne: null } }, function (err, foundUsers) {
    if (err) {
      console.log(err);
    } else {
      if (foundUsers) {
        res.render("secrets", { usersWithSecrets: foundUsers });
      }
    }
  });
});

app.get("/logout", function (req, res) {
  req.logout();
  res.redirect("/");
});

//google registration
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);

app.get(
  "/auth/google/myFeed",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function (req, res) {
    // Successful authentication, redirect secrets.
    res.redirect("/secrets");
  }
);

app.get("/submit", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});
//POST REQUESTS
//post req happens when they have submited a button and we make sth happen for them
app.post("/register", function (req, res) {
  User.register({ username: req.body.username }, req.body.password, function (
    err,
    user
  ) {
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/secrets");
      });
    }
  });
});

app.post("/submit", function (req, res) {
  const submitedSecret = req.body.secret;
  console.log("A secret is submited with " + req.user.id + " ID.");
  User.findById(req.user.id, function (err, foundUser) {
    if (err) {
      console.log(err);
    } else {
      if (foundUser) {
        foundUser.secret = submitedSecret;
        foundUser.save(function () {
          res.redirect("/secrets");
        });
      }
    }
  });
});
app.post("/login", function (req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });
  req.login(user, function (err) {
    if (err) console.log(err);
    else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/secrets");
      });
    }
  });
});

app.get("/about", function (req, res) {
  res.render("about");
});
