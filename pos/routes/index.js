var express = require("express");
var router = express.Router();
const isLoggedIn = require("../helpers/util");
const bcrypt = require("bcrypt");

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
            if (req.session.user.role === "admin") {
              res.redirect("/dashboard");
            } else {
              res.redirect("/sales");
            }
          }
        );
        // Store hash in your password DB.
      }
    );
  });

  router.get("/", isLoggedIn, function (req, res, next) {
    res.redirect("/dashboard");
  });
  return router;
};
