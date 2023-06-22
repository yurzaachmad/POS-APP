var express = require("express");
var router = express.Router();
const bcrypt = require("bcrypt");
const saltRounds = 10;

const isLoggedIn = function (req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.redirect("/login");
  }
};

/* GET home page. */
module.exports = function (db) {
  router.get("/login", function (req, res, next) {
    res.render("login", { errorMessage: req.flash("errorMessage") });
  });

  router.get("/logout", function (req, res, next) {
    req.session.destroy(function (err) {
      res.redirect("/login");
    });
  });

  router.get("/user", function (req, res, next) {
    res.render("user");
  });

  router.post("/login", function (req, res, next) {
    db.query(
      "select * from users where email = $1",
      [req.body.email],
      (err, data) => {
        if (data.rows.length == 0) {
          req.flash("errorMessage", "email doesn't exist!");
          return res.redirect("/login");
        }
        bcrypt.compare(
          req.body.password,
          data.rows[0].password,
          function (err, result) {
            if (!result) {
              req.flash("errorMessage", "password is wrong!");
              return res.redirect("/login");
            }
            req.session.user = data.rows[0];
            res.redirect("/dashboard");
          }
        );
        // Store hash in your password DB.
      }
    );
  });

  router.get("/register", function (req, res, next) {
    res.render("register");
  });

  router.post("/register", function (req, res, next) {
    if (req.body.retypepassword != req.body.password) {
      return res.send("password does'nt match");
    }

    db.query(
      "select * from users where email = $1",
      [req.body.email],
      (err, data) => {
        if (data.rows.length > 0) return res.send("email is exist");

        const password = req.body.password;
        bcrypt.hash(password, saltRounds, function (err, hash) {
          if (err) throw err;
          db.query(
            "insert into users(email, password) values ($1, $2)",
            [req.body.email, hash],
            (err, data) => {
              console.log("ini password hash", data);
              if (err) {
                console.log(err);
              }
              res.redirect("/dashboard");
            }
          );
        });
        // Store hash in your password DB.
      }
    );
  });

  router.get("/dashboard", isLoggedIn, function (req, res, next) {
    res.render("dashboard");
  });
  return router;
};
