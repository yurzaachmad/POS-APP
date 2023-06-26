var express = require("express");
var router = express.Router();

module.exports = function (db) {
  router.get("/datasuppliers", async (req, res) => {
    let params = [];

    if (req.query.search.value) {
      params.push(`name ilike '%${req.query.search.value}%'`);
      params.push(`address ilike '%${req.query.search.value}%'`);
      params.push(`phone ilike '%${req.query.search.value}%'`);
    }

    const limit = req.query.length;
    const offset = req.query.start;
    const sortBy = req.query.columns[req.query.order[0].column].data;
    const sortMode = req.query.order[0].dir;

    const total = await db.query(
      `select count(*) as total from suppliers${
        params.length > 0 ? ` where ${params.join(" or ")}` : ""
      }`
    );
    const data = await db.query(
      `select * from suppliers${
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

  router.get("/suppliers", function (req, res, next) {
    db.query("select * from suppliers", (err, data) => {
      if (err) {
        console.log(err);
      }
      // console.log("ini", data.rows);
      res.render("suppliers/supplier", {
        data: data.rows,
      });
    });
  });

  router.get("/supplier/add", (req, res) => {
    res.render("suppliers/supplierform", { data: {}, renderFrom: "add" });
  });

  router.post("/supplier/add", (req, res) => {
    db.query(
      "INSERT INTO suppliers(name, address, phone) VALUES ($1, $2, $3)",
      [req.body.name, req.body.address, req.body.phone],
      (err, data) => {
        if (err) {
          console.log(err);
        }
        res.redirect("/suppliers");
      }
    );
  });

  router.get("/supplier/edit/:id", (req, res) => {
    const id = req.params.id;
    db.query(
      "select * from suppliers where supplierid = $1",
      [id],
      (err, item) => {
        if (err) {
          console.log(err);
        }
        console.log(item.rows);
        res.render("suppliers/supplierform", {
          data: item.rows[0],
          renderFrom: "edit",
        });
      }
    );
  });

  router.post("/supplier/edit/:id", (req, res) => {
    const id = req.params.id;
    db.query(
      "UPDATE suppliers SET name = $1, address = $2, phone = $3 where supplierid = $4",
      [req.body.name, req.body.address, req.body.phone, id],
      function (err) {
        if (err) {
          console.error(err);
        } else {
          res.redirect("/suppliers");
        }
      }
    );
  });

  router.get("/supplier/delete/:id", (req, res) => {
    const id = req.params.id;
    db.query("delete from suppliers where supplierid = $1", [id], (err) => {
      if (err) {
        console.log("hapus data suppliers gagal");
      }
      res.redirect("/suppliers");
    });
  });

  return router;
};
