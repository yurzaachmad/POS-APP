var express = require("express");
var router = express.Router();

module.exports = function (db) {
  router.get("/dashboard", function (req, res, next) {
    db.query("select * from purchases", (err, data) => {
      if (err) {
        console.log(err);
      }
      const totalSum = data.rows.reduce((accumulator, current) => {
        const sum = parseFloat(current.totalsum);
        return accumulator + sum;
      }, 0);
      db.query("select * from sales", (err, item) => {
        const totalSale = item.rows.reduce((accumulator, current) => {
          const sum = parseFloat(current.totalsum);
          return accumulator + sum;
        }, 0);
        const earnings = totalSale - totalSum;
        console.log("pendapatan", item.rows.length);
        const saled = item.rows.length;
        res.render("dashboard", { totalSum, totalSale, earnings, saled });
      });
    });
  });

  return router;
};
