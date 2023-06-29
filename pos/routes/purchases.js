var express = require("express");
var router = express.Router();
const isLoggedIn = require("../helpers/util");
var moment = require("moment");

module.exports = function (db) {
  router.get("/purchases", function (req, res, next) {
    console.log(req.session.user);
    // console.log(userid);
    db.query("select * from purchases", (err, data) => {
      if (err) {
        console.log(err);
      }
      // console.log("ini", data.rows);
      res.render("purchases/purchase", {
        data: data.rows,
      });
    });
  });

  router.get("/purchase/add", (req, res) => {
    const { userid } = req.session.user;

    db.query(
      "INSERT INTO purchases (invoice, totalsum, operator) VALUES (purchaseinvoice(), 0, $1) RETURNING *",
      [userid],
      (err, data) => {
        if (err) {
          console.log(err);
        }

        // console.log("Data baru yang dimasukkan:", data.rows[0]);

        res.redirect(`/purchase/${data.rows[0].invoice}`);
      }
    );
  });

  router.get("/purchase/:invoice", (req, res) => {
    const { userid } = req.session.user;
    const { invoice } = req.params;

    db.query(
      "select * from purchases where invoice = $1",
      [invoice],
      (err, item) => {
        db.query(
          "select * from users where userid = $1",
          [userid],
          (err, items) => {
            db.query("select * from goods", (err, datagoods) => {
              db.query("select * from suppliers", (err, supply) => {
                res.render("purchases/purchaseform", {
                  data: item.rows[0],
                  dataa: items.rows[0],
                  moment,
                  datagood: datagoods.rows,
                  suppliers: supply.rows,
                });
              });
            });
          }
        );
      }
    );
  });

  router.get("/purchase/get/:barcode", (req, res) => {
    const { barcode } = req.params;
    db.query(
      "select * from goods where barcode = $1",
      [barcode],
      (err, item) => {
        // console.log(item);
        if (err) {
          console.log(err);
        }
        res.json(item.rows);
      }
    );
  });

  router.post("/purchase/add/items", (req, res) => {
    const purchasePrice = parseFloat(
      req.body.purchasepricegoods.replace(/[^0-9.-]+/g, "")
    );
    const totalprice = parseFloat(
      req.body.totalprice.replace(/[^0-9.-]+/g, "")
    );
    db.query(
      "insert into purchaseitems (invoice, itemcode, quantity, purchaseprice, totalprice) values ($1, $2, $3, $4, $5) returning *",
      [
        req.body.invoice,
        req.body.barcode,
        req.body.qtygoods,
        purchasePrice,
        totalprice,
      ],
      (err, item) => {
        if (err) {
          console.log(err);
        }
        console.log(item, "ini");
        res.redirect("/purchases/add");
      }
    );
  });

  return router;
};
