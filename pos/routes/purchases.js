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
      console.log("ini", data.rows);
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

        console.log("Data baru yang dimasukkan:", data.rows[0]);

        res.redirect(`/purchase/${data.rows[0].invoice}`);
      }
    );
  });

  router.get("/purchase/:invoice", (req, res) => {
    const { userid } = req.session.user;
    const { invoice } = req.params;
    console.log("skrng", invoice);
    db.query(
      "select * from purchases where invoice = $1",
      [invoice],
      (err, item) => {
        db.query(
          "select * from users where userid = $1",
          [userid],
          (err, items) => {
            res.render("purchases/purchaseform", {
              data: item.rows[0],
              dataa: items.rows[0],
              moment,
            });
          }
        );
      }
    );
  });

  return router;
};
