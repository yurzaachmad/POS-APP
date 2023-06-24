var express = require("express");
var router = express.Router();
const isLoggedIn = require("../helpers/util");
const bcrypt = require("bcrypt");
const saltRounds = 10;

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
    res.render("register", { errorRegister: req.flash("errorRegister") });
  });

  router.post("/register", function (req, res, next) {
    if (req.body.retypepassword != req.body.password) {
      req.flash("errorRegister", "password does'nt match");
      return res.redirect("/register");
    }

    db.query(
      "select * from users where email = $1",
      [req.body.email],
      (err, data) => {
        if (data.rows.length > 0) {
          req.flash("errorRegister", "email is exist!");
          return res.redirect("/register");
        }

        const password = req.body.password;
        bcrypt.hash(password, saltRounds, function (err, hash) {
          if (err) throw err;
          db.query(
            "insert into users(email, password) values ($1, $2)",
            [req.body.email, hash],
            (err, data) => {
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
