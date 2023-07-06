var express = require("express");
var router = express.Router();
var moment = require("moment");

module.exports = function (db) {
  router.get("/datasales", async (req, res) => {
    let params = [];

    if (req.query.search.value) {
      params.push(`invoice ilike '%${req.query.search.value}%'`);
    }

    const limit = req.query.length;
    const offset = req.query.start;
    const sortBy = req.query.columns[req.query.order[0].column].data;
    const sortMode = req.query.order[0].dir;

    const total = await db.query(
      `select count(*) as total from sales${
        params.length > 0 ? ` where ${params.join(" or ")}` : ""
      }`
    );
    const data = await db.query(
      `select * from sales${
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

  router.get("/sales", (req, res) => {
    db.query("select * from sales", (err, data) => {
      if (err) {
        console.log(err);
      }
      res.render("sales/sales", { user: req.session.user });
    });
  });

  router.get("/sales/add", (req, res) => {
    const { userid } = req.session.user;

    db.query(
      "INSERT INTO sales (invoice, totalsum, operator) VALUES (salesinvoice(), 0, $1) RETURNING *",
      [userid],
      (err, data) => {
        if (err) {
          console.log(err);
        }
        res.redirect(`/sales/${data.rows[0].invoice}`);
      }
    );
  });

  router.get("/sales/:invoice", (req, res) => {
    const { userid } = req.session.user;
    const { invoice } = req.params;

    db.query(
      "select * from sales where invoice = $1",
      [invoice],
      (err, item) => {
        db.query(
          "select * from users where userid = $1",
          [userid],
          (err, items) => {
            db.query("select * from goods", (err, datagoods) => {
              db.query("select * from customers", (err, supply) => {
                res.render("sales/salesform", {
                  data: item.rows[0],
                  dataa: items.rows[0],
                  moment,
                  datagood: datagoods.rows,
                  customers: supply.rows,
                  user: req.session.user,
                });
              });
            });
          }
        );
      }
    );
  });

  router.get("/sales/get/:barcode", (req, res) => {
    const { barcode } = req.params;
    db.query(
      "select * from goods where barcode = $1",
      [barcode],
      (err, item) => {
        if (err) {
          console.log(err);
        }
        res.json(item.rows);
      }
    );
  });

  router.post("/sales/add/items", (req, res) => {
    const sellingPrice = parseFloat(
      req.body.sellingpricegoods.replace(/[^0-9.-]+/g, "")
    );
    const totalprice = parseFloat(
      req.body.totalprice.replace(/[^0-9.-]+/g, "")
    );
    db.query(
      "insert into saleitems (invoice, itemcode, quantity, sellingprice, totalprice) values ($1, $2, $3, $4, $5) returning *",
      [
        req.body.invoice,
        req.body.barcode,
        req.body.qtygoods,
        sellingPrice,
        totalprice,
      ],
      (err, item) => {
        if (err) {
          console.log(err);
        }
        res
          .status(200)
          .json({ message: "Data berhasil dimasukkan ke database." });
      }
    );
  });

  router.post("/sales/add/sales", (req, res) => {
    const invoice = req.body.invoice;
    const formattedValue = req.body.totalsum.replace(/[^0-9.,-]/g, "");
    const formattedValuechange = req.body.moneychange.replace(/[^0-9.,-]/g, ""); // Menghapus karakter selain angka, koma, dan tanda minus
    const totalsum = parseFloat(formattedValue.replace(",", "")); // Menghapus koma sebagai pemisah ribuan
    const change = parseFloat(formattedValuechange.replace(",", ""));
    const { customer, pay } = req.body;
    const { userid } = req.session.user;
    db.query(
      "update sales set totalsum = $1, customer = $2, operator = $3, pay = $4, change = $5 WHERE invoice = $6",
      [totalsum, customer, userid, pay, change, invoice],
      (err, item) => {
        if (err) {
          console.log(err);
        }
        res.redirect("/sales");
      }
    );
  });

  router.get("/sales/edit/:invoice", (req, res) => {
    const { invoice } = req.params;
    const { userid } = req.session.user;
    db.query(
      "select * from sales where invoice = $1",
      [invoice],
      (err, item) => {
        db.query(
          "select * from users where userid = $1",
          [userid],
          (err, items) => {
            db.query("select * from goods", (err, datagoods) => {
              db.query("select * from customers", (err, customer) => {
                db.query("select * from saleitems", (err, itempurchase) => {
                  res.render("sales/salesform", {
                    data: item.rows[0],
                    dataa: items.rows[0],
                    moment,
                    datagood: datagoods.rows,
                    customers: customer.rows,
                    itemspurchase: itempurchase.rows[0],
                    user: req.session.user,
                  });
                });
              });
            });
          }
        );
      }
    );
  });

  router.get("/sales/get/edit/item/:invoice", (req, res) => {
    const { invoice } = req.params;
    db.query(
      "SELECT saleitems.*, goods.name FROM saleitems LEFT JOIN goods ON saleitems.itemcode = goods.barcode WHERE saleitems.invoice = $1 ORDER BY saleitems.id",
      [invoice],
      (err, itemsales) => {
        if (err) {
          console.log(err);
        }
        res.json(itemsales.rows);
      }
    );
  });

  router.get("/sales/deleteitems/:id", (req, res) => {
    const { id } = req.params;
    db.query(
      "SELECT invoice FROM saleitems WHERE id = $1",
      [id],
      (err, result) => {
        if (err) {
          console.log(err);
        }

        const invoice = result.rows[0].invoice;
        db.query(
          "delete from saleitems where id = $1",
          [id],
          (err, itempurchase) => {
            if (err) {
              console.log(err);
            }
            res.redirect(`/sales/edit/${invoice}`);
          }
        );
      }
    );
  });

  router.get("/sales/delete/:id", (req, res) => {
    const id = req.params.id;
    db.query("delete from saleitems where invoice = $1", [id], (err) => {
      if (err) {
        console.log("hapus data sale item gagal");
      }
      db.query("delete from sales where invoice = $1", [id], (err) => {
        if (err) {
          console.log("hapus data sales gagal");
        }
        res.redirect("/sales");
      });
    });
  });

  return router;
};
