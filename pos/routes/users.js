var express = require("express");
var router = express.Router();
const isLoggedIn = require("../helpers/util");
const isAdmin = require("../helpers/utill");
const bcrypt = require("bcrypt");
const saltRounds = 10;

/* GET users listing. */
module.exports = function (db) {
  router.get("/datatable", async (req, res) => {
    let params = [];

    if (req.query.search.value) {
      params.push(`email ilike '%${req.query.search.value}%'`);
      params.push(`name ilike '%${req.query.search.value}%'`);
      params.push(`role ilike '%${req.query.search.value}%'`);
    }

    const limit = req.query.length;
    const offset = req.query.start;
    const sortBy = req.query.columns[req.query.order[0].column].data;
    const sortMode = req.query.order[0].dir;

    const total = await db.query(
      `select count(*) as total from users${
        params.length > 0 ? ` where ${params.join(" or ")}` : ""
      }`
    );
    const data = await db.query(
      `select * from users${
        params.length > 0 ? ` where ${params.join(" or ")}` : ""
      } order by ${sortBy} ${sortMode} limit ${limit} offset ${offset} `
    );
    const response = {
      draw: Number(req.query.draw),
      recordsTotal: total.rows[0].total,
      recordsFiltered: total.rows[0].total,
      data: data.rows,
    };
    res.json(response);
  });
  router.get("/", isLoggedIn, isAdmin, function (req, res, next) {
    const stockAlert = req.session.stockAlert;
    db.query("select * from users", (err, data) => {
      if (err) {
        console.log(err);
      }
      res.render("users/user", {
        data: data.rows,
        user: req.session.user,
        stockAlert,
        error: req.flash("error"),
      });
    });
  });

  router.get("/add", isLoggedIn, isAdmin, (req, res) => {
    const stockAlert = req.session.stockAlert;
    res.render("users/addform", {
      data: {},
      isEdit: false,
      user: req.session.user,
      stockAlert,
    });
  });

  router.post("/add", (req, res) => {
    bcrypt.hash(req.body.password, saltRounds, function (err, hash) {
      db.query(
        "INSERT INTO users(email, name, password, role) VALUES ($1, $2, $3, $4)",
        [req.body.email, req.body.name, hash, req.body.role],
        (err, data) => {
          if (err) {
            console.log(err);
          }
          res.redirect("/users");
        }
      );
    });
  });

  router.get("/edit/:id", isLoggedIn, isAdmin, (req, res) => {
    const id = req.params.id;
    const stockAlert = req.session.stockAlert;
    db.query("select * from users where userid = $1", [id], (err, item) => {
      if (err) {
        console.log(err);
      }
      res.render("users/addform", {
        data: item.rows[0],
        isEdit: true,
        user: req.session.user,
        stockAlert,
      });
    });
  });

  router.post("/edit/:id", (req, res) => {
    const id = req.params.id;
    db.query(
      "UPDATE users SET email = $1, name = $2, role = $3 where userid = $4",
      [req.body.email, req.body.name, req.body.role, id],
      function (err) {
        if (err) {
          console.error(err);
        } else {
          res.redirect("/users");
        }
      }
    );
  });

  router.get("/delete/:id", (req, res) => {
    const id = req.params.id;
    db.query("delete from users where userid = $1", [id], (err) => {
      if (err) {
        console.log("hapus data users gagal");
        req.flash("error", err.message);
        return res.redirect(`/`);
      }
      res.redirect("/users");
    });
  });

  //update profile is below

  router.get("/profile", isLoggedIn, (req, res) => {
    const { userid } = req.session.user;
    const stockAlert = req.session.stockAlert;
    db.query("select * from users where userid = $1", [userid], (err, data) => {
      res.render("users/profileform", {
        data: data.rows[0],
        user: req.session.user,
        succesMessage: req.flash("succesMessage"),
        succesMessagePassword: {},
        errorRegister: {},
        errorMessage: {},
        isEdit: true,
        isProfile: false,
        stockAlert,
      });
    });
  });

  router.post("/profile", (req, res) => {
    const { userid } = req.session.user;
    db.query(
      "update users set name = $1, email =$2 where userid = $3",
      [req.body.name, req.body.email, userid],
      (err, data) => {
        if (err) {
          console.log(err);
        }
        req.session.user.name = req.body.name;
        req.flash("succesMessage", "your profile has been updated");
        return res.redirect("/users/profile");
      }
    );
  });

  router.get("/password", isLoggedIn, (req, res) => {
    const { userid } = req.session.user;
    const stockAlert = req.session.stockAlert;
    db.query("select * from users where userid = $1", [userid], (err, data) => {
      res.render("users/profileform", {
        data: data.rows[0],
        user: req.session.user,
        succesMessage: {},
        errorMessage: req.flash("errorMessage"),
        succesMessagePassword: req.flash("succesMessage"),
        errorRegister: req.flash("errorRegister"),
        isEdit: false,
        isProfile: true,
        stockAlert,
      });
    });
  });

  router.post("/password", function (req, res, next) {
    const { userid } = req.session.user;
    db.query(
      "select * from users where email = $1",
      [req.body.email],
      (err, data) => {
        if (data.rows.length == 0) {
          req.flash("errorMessage", "email doesn't exist!");
          return res.redirect("/users/password");
        }
        bcrypt.compare(
          req.body.password,
          data.rows[0].password,
          function (err, result) {
            if (!result) {
              req.flash("errorMessage", "old password is wrong!");
              return res.redirect("/users/password");
            }
            if (req.body.newpassword != req.body.retypepassword) {
              req.flash("errorRegister", "retype password does'nt match");
              return res.redirect("/users/password");
            }
            const password = req.body.newpassword;
            bcrypt.hash(password, saltRounds, function (err, hash) {
              if (err) throw err;
              db.query(
                "update users set password = $1 where userid = $2",
                [hash, userid],
                (err, data) => {
                  if (err) {
                    console.log(err);
                  }
                  req.flash("succesMessage", "your password has been updated");
                  return res.redirect("/users/password");
                }
              );
            });
          }
        );
        // Store hash in your password DB.
      }
    );
  });

  return router;
};
