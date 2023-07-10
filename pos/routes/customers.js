var express = require("express");
var router = express.Router();
const isLoggedIn = require("../helpers/util");

module.exports = function (db) {
  router.get("/customertable", async (req, res) => {
    let params = [];

    if (req.query.search.value) {
      params.push(`name ilike '%${req.query.search.value}%'`);
      params.push(`address ilike '%${req.query.search.value}%'`);
    }

    const limit = req.query.length;
    const offset = req.query.start;
    const sortBy = req.query.columns[req.query.order[0].column].data;
    const sortMode = req.query.order[0].dir;

    const total = await db.query(
      `select count(*) as total from customers${
        params.length > 0 ? ` where ${params.join(" or ")}` : ""
      }`
    );
    const data = await db.query(
      `select * from customers${
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
  router.get("/", isLoggedIn, function (req, res) {
    const stockAlert = req.session.stockAlert;
    db.query("select * from customers", (err, data) => {
      if (err) {
        console.log(err);
      }
      res.render("customers/customer", {
        data: data.rows,
        user: req.session.user,
        stockAlert,
        error: req.flash("error"),
      });
    });
  });

  router.get("/add", isLoggedIn, function (req, res) {
    const stockAlert = req.session.stockAlert;
    res.render("customers/customerform", {
      data: {},
      renderFrom: "add",
      user: req.session.user,
      stockAlert,
    });
  });

  router.post("/add", (req, res) => {
    db.query(
      "INSERT INTO customers(name, address, phone) VALUES ($1, $2, $3)",
      [req.body.name, req.body.address, req.body.phone],
      (err, data) => {
        if (err) {
          console.log(err);
        }
        res.redirect("/customers");
      }
    );
  });

  router.get("/edit/:id", isLoggedIn, (req, res) => {
    const stockAlert = req.session.stockAlert;
    const id = req.params.id;
    db.query(
      "select * from customers where customerid = $1",
      [id],
      (err, item) => {
        if (err) {
          console.log(err);
        }
        console.log(item.rows);
        res.render("customers/customerform", {
          data: item.rows[0],
          renderFrom: "edit",
          user: req.session.user,
          stockAlert,
        });
      }
    );
  });

  router.post("/edit/:id", (req, res) => {
    const id = req.params.id;
    db.query(
      "UPDATE customers SET name = $1, address = $2, phone = $3 where customerid = $4",
      [req.body.name, req.body.address, req.body.phone, id],
      function (err) {
        if (err) {
          console.error(err);
        } else {
          res.redirect("/customers");
        }
      }
    );
  });

  router.get("/delete/:id", (req, res) => {
    const id = req.params.id;
    db.query("delete from customers where customerid = $1", [id], (err) => {
      if (err) {
        req.flash("error", err.message);
        return res.redirect(`/`);
      }
      res.redirect("/customers");
    });
  });

  return router;
};
