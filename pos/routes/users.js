var express = require("express");
var router = express.Router();
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
    console.log(data);
    const response = {
      draw: Number(req.query.draw),
      recordsTotal: total.rows[0].total,
      recordsFiltered: total.rows[0].total,
      data: data.rows,
    };
    res.json(response);
  });
  router.get("/user", function (req, res, next) {
    db.query("select * from users", (err, data) => {
      console.log(data.rows);
      if (err) {
        console.log(err);
      }
      res.render("user", {
        data: data.rows,
      });
    });
  });

  router.get("/user/add", (req, res) => {
    res.render("addform", { data: {}, isEdit: false });
  });

  router.post("/user/add", (req, res) => {
    bcrypt.hash(req.body.password, saltRounds, function (err, hash) {
      db.query(
        "INSERT INTO users(email, name, password, role) VALUES ($1, $2, $3, $4)",
        [req.body.email, req.body.name, hash, req.body.role],
        (err, data) => {
          console.log("ini", data);
          if (err) {
            console.log(err);
          }
          res.redirect("/user");
        }
      );
    });
  });

  router.get("/user/edit/:id", (req, res) => {
    const id = req.params.id;
    db.query("select * from users where userid = $1", [id], (err, item) => {
      if (err) {
        console.log(err);
      }
      console.log(item.rows);
      res.render("addform", { data: item.rows[0], isEdit: true });
    });
  });

  router.post("/user/edit/:id", (req, res) => {
    const id = req.params.id;
    db.query(
      "UPDATE users SET email = $1, name = $2, role = $3 where userid = $4",
      [req.body.email, req.body.name, req.body.role, id],
      function (err) {
        if (err) {
          console.error(err);
        } else {
          res.redirect("/user");
        }
      }
    );
  });

  router.get("/user/delete/:id", (req, res) => {
    const id = req.params.id;
    db.query("delete from users where userid = $1", [id], (err) => {
      if (err) {
        console.log("hapus data Kontrak gagal");
      }
      res.redirect("/user");
    });
  });

  return router;
};
