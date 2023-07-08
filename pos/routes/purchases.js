var express = require("express");
var router = express.Router();
const isLoggedIn = require("../helpers/util");
var moment = require("moment");

module.exports = function (db) {
  router.get("/datapurchase", async (req, res) => {
    let params = [];

    if (req.query.search.value) {
      params.push(`invoice ilike '%${req.query.search.value}%'`);
    }

    const limit = req.query.length;
    const offset = req.query.start;
    const sortBy = req.query.columns[req.query.order[0].column].data;
    const sortMode = req.query.order[0].dir;

    const total = await db.query(
      `select count(*) as total from purchases${
        params.length > 0 ? ` where ${params.join(" or ")}` : ""
      }`
    );
    const data = await db.query(
      `select * from purchases${
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
  router.get("/", function (req, res, next) {
    const stockAlert = req.session.stockAlert;
    db.query("select * from purchases", (err, data) => {
      if (err) {
        console.log(err);
      }
      res.render("purchases/purchase", {
        data: data.rows,
        user: req.session.user,
        stockAlert,
      });
    });
  });

  router.get("/add", (req, res) => {
    const { userid } = req.session.user;

    db.query(
      "INSERT INTO purchases (invoice, totalsum, operator) VALUES (purchaseinvoice(), 0, $1) RETURNING *",
      [userid],
      (err, data) => {
        if (err) {
          console.log(err);
        }
        res.redirect(`/purchases/${data.rows[0].invoice}`);
      }
    );
  });

  router.get("/:invoice", (req, res) => {
    const { userid } = req.session.user;
    const { invoice } = req.params;
    const stockAlert = req.session.stockAlert;

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
                  user: req.session.user,
                  stockAlert,
                });
              });
            });
          }
        );
      }
    );
  });

  router.get("/get/:barcode", (req, res) => {
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

  router.post("/add/items", (req, res) => {
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
        res
          .status(200)
          .json({ message: "Data berhasil dimasukkan ke database." });
      }
    );
  });

  router.post("/add/purchases", (req, res) => {
    const invoice = req.body.invoice;
    const formattedValue = req.body.totalsum.replace(/[^0-9.,-]/g, ""); // Menghapus karakter selain angka, koma, dan tanda minus
    const totalsum = parseFloat(formattedValue.replace(",", "")); // Menghapus koma sebagai pemisah ribuan

    const { supply } = req.body;
    const { userid } = req.session.user;
    db.query(
      "update purchases set totalsum = $1, supplier = $2, operator = $3 WHERE invoice = $4",
      [totalsum, supply, userid, invoice],
      (err, item) => {
        if (err) {
          console.log(err);
        }
        db.query("SELECT * FROM goods", (err, goodsData) => {
          if (err) {
            console.log(err);
            return res
              .status(500)
              .json({ message: "Terjadi kesalahan pada server." });
          }
          // Menyimpan data stok ke dalam session
          const stockAlert = goodsData.rows.filter((item) => item.stock < 5);
          req.session.stockAlert = stockAlert;
          res.redirect("/purchases");
        });
      }
    );
  });

  router.get("/edit/:invoice", (req, res) => {
    const { invoice } = req.params;
    const { userid } = req.session.user;
    const stockAlert = req.session.stockAlert;
    db.query(
      "select * from purchases where invoice = $1",
      [invoice],
      (err, item) => {
        console.log(item);
        db.query(
          "select * from users where userid = $1",
          [userid],
          (err, items) => {
            db.query("select * from goods", (err, datagoods) => {
              db.query("select * from suppliers", (err, supply) => {
                db.query("select * from purchaseitems", (err, itempurchase) => {
                  res.render("purchases/purchaseform", {
                    data: item.rows[0],
                    dataa: items.rows[0],
                    moment,
                    datagood: datagoods.rows,
                    suppliers: supply.rows,
                    itemspurchase: itempurchase.rows[0],
                    user: req.session.user,
                    stockAlert,
                  });
                });
              });
            });
          }
        );
      }
    );
  });

  router.get("/get/edit/item/:invoice", (req, res) => {
    const { invoice } = req.params;
    db.query(
      "SELECT purchaseitems.*, goods.name FROM purchaseitems LEFT JOIN goods ON purchaseitems.itemcode = goods.barcode WHERE purchaseitems.invoice = $1 ORDER BY purchaseitems.id",
      [invoice],
      (err, itempurchase) => {
        if (err) {
          console.log(err);
        }
        res.json(itempurchase.rows);
      }
    );
  });

  router.get("/deleteitems/:id", (req, res) => {
    const { id } = req.params;
    db.query(
      "SELECT invoice FROM purchaseitems WHERE id = $1",
      [id],
      (err, result) => {
        if (err) {
          console.log(err);
        }

        const invoice = result.rows[0].invoice;
        db.query(
          "delete from purchaseitems where id = $1",
          [id],
          (err, itempurchase) => {
            if (err) {
              console.log(err);
            }
            db.query("SELECT * FROM goods", (err, goodsData) => {
              if (err) {
                console.log(err);
                return res
                  .status(500)
                  .json({ message: "Terjadi kesalahan pada server." });
              }

              // Menyimpan data stok ke dalam session
              const stockAlert = goodsData.rows.filter(
                (item) => item.stock < 5
              );
              req.session.stockAlert = stockAlert;
              res.redirect(`/purchase/edit/${invoice}`);
            });
          }
        );
      }
    );
  });

  router.get("/delete/:id", (req, res) => {
    const id = req.params.id;
    db.query("delete from purchaseitems where invoice = $1", [id], (err) => {
      if (err) {
        console.log("hapus data purchase item gagal");
      }
      db.query("delete from purchases where invoice = $1", [id], (err) => {
        if (err) {
          console.log("hapus data purchase gagal");
        }
        db.query("SELECT * FROM goods", (err, goodsData) => {
          if (err) {
            console.log(err);
            return res
              .status(500)
              .json({ message: "Terjadi kesalahan pada server." });
          }

          // Menyimpan data stok ke dalam session
          const stockAlert = goodsData.rows.filter((item) => item.stock < 5);
          req.session.stockAlert = stockAlert;
          res.redirect("/purchases");
        });
      });
    });
  });

  return router;
};
