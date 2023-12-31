var express = require("express");
var router = express.Router();
const isLoggedIn = require("../helpers/util");
const isAdmin = require("../helpers/utill");

module.exports = function (db) {
  router.get("/datatable", async (req, res) => {
    let params = [];

    if (req.query.search.value) {
      params.push(`unit ilike '%${req.query.search.value}%'`);
      params.push(`name ilike '%${req.query.search.value}%'`);
      params.push(`note ilike '%${req.query.search.value}%'`);
    }

    const limit = req.query.length;
    const offset = req.query.start;
    const sortBy = req.query.columns[req.query.order[0].column].data;
    const sortMode = req.query.order[0].dir;

    const total = await db.query(
      `select count(*) as total from units${
        params.length > 0 ? ` where ${params.join(" or ")}` : ""
      }`
    );
    const data = await db.query(
      `select * from units${
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
    db.query("select * from units", (err, data) => {
      if (err) {
        console.log(err);
      }
      res.render("units/unit", {
        data: data.rows,
        user: req.session.user,
        stockAlert,
        error: req.flash("error"),
      });
    });
  });

  router.get("/add", isLoggedIn, isAdmin, (req, res) => {
    const stockAlert = req.session.stockAlert;
    res.render("units/unitform", {
      data: {},
      renderFrom: "add",
      user: req.session.user,
      stockAlert,
      error: req.flash("error"),
    });
  });

  router.post("/add", (req, res) => {
    db.query(
      "INSERT INTO units(unit, name, note) VALUES ($1, $2, $3)",
      [req.body.unit, req.body.name, req.body.note],
      (err, data) => {
        if (err) {
          console.log(err);
          req.flash("error", err.message);
          return res.redirect(`/units/add`);
        }
        res.redirect("/units");
      }
    );
  });

  router.get("/edit/:id", isLoggedIn, isAdmin, (req, res) => {
    const id = req.params.id;
    const stockAlert = req.session.stockAlert;
    db.query("select * from units where unit = $1", [id], (err, item) => {
      if (err) {
        console.log(err);
      }
      res.render("units/unitform", {
        data: item.rows[0],
        renderFrom: "edit",
        user: req.session.user,
        stockAlert,
        error: req.flash("error"),
      });
    });
  });

  router.post("/edit/:id", (req, res) => {
    const id = req.params.id;
    db.query(
      "UPDATE units SET unit = $1, name = $2, note = $3 where unit = $4",
      [req.body.unit, req.body.name, req.body.note, id],
      function (err) {
        if (err) {
          console.error(err);
          req.flash("error", err.message);
          res.redirect(`/units/edit/${id}`);
        } else {
          res.redirect("/units");
        }
      }
    );
  });

  router.get("/delete/:id", (req, res) => {
    const id = req.params.id;
    db.query("delete from units where unit = $1", [id], (err) => {
      if (err) {
        console.log("hapus data Units gagal");
        req.flash("error", err.message);
        return res.redirect(`/`);
      }
      res.redirect("/units");
    });
  });

  return router;
};
