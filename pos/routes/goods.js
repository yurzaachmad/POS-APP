var express = require("express");
var router = express.Router();
var path = require("path");
const isLoggedIn = require("../helpers/util");
const isAdmin = require("../helpers/utill");

module.exports = function (db) {
  router.get("/datagoods", async (req, res) => {
    let params = [];
    if (req.query.search.value) {
      const searchValue = req.query.search.value;
      params.push(`barcode ILIKE '%${searchValue}%'`);
      params.push(`name ILIKE '%${searchValue}%'`);
      params.push(`unit ILIKE '%${searchValue}%'`);
      // casting, changing the stock from integer into string
      params.push(`stock::text ILIKE '%${searchValue}%'`);
    }

    const limit = req.query.length;
    const offset = req.query.start;
    const sortBy = req.query.columns[req.query.order[0].column].data;
    const sortMode = req.query.order[0].dir;

    const total = await db.query(
      `select count(*) as total from goods${
        params.length > 0 ? ` where ${params.join(" or ")}` : ""
      }`
    );
    const data = await db.query(
      `select * from goods${
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
    db.query("select * from goods", (err, data) => {
      if (err) {
        console.log(err);
      }
      res.render("goods/good", {
        data: data.rows,
        user: req.session.user,
        stockAlert,
        error: req.flash("error"),
      });
    });
  });

  router.get("/add", isLoggedIn, isAdmin, (req, res) => {
    const stockAlert = req.session.stockAlert;
    db.query("select * from units", (err, data) => {
      res.render("goods/goodform", {
        data: {},
        item: data.rows,
        renderFrom: "add",
        user: req.session.user,
        stockAlert,
        error: req.flash("error"),
      });
    });
  });

  router.post("/add", (req, res) => {
    if (!req.files || Object.keys(req.files).length === 0) {
      req.flash("error", "insert goods data");
      return res.redirect(`/goods/add`);
    }

    // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
    let picture = req.files.picture;
    pictureName = `${Date.now()}-${picture.name}`;
    let uploadPath = path.join(
      __dirname,
      "..",
      "public",
      "images",
      "pictures",
      pictureName
    );

    // Use the mv() method to place the file somewhere on your server
    picture.mv(uploadPath, function (err) {
      if (err) return res.status(500).send(err);

      db.query(
        "INSERT INTO goods(barcode, name, stock, purchaseprice, sellingprice, picture, unit) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [
          req.body.barcode,
          req.body.name,
          req.body.stock,
          req.body.purchaseprice,
          req.body.sellingprice,
          pictureName,
          req.body.unit,
        ],
        (err, data) => {
          if (err) {
            console.log(err);
            req.flash("error", err.message);
            return res.redirect(`/goods/add`);
          }
          res.redirect("/goods");
        }
      );
    });
  });

  router.get("/edit/:id", isLoggedIn, isAdmin, (req, res) => {
    const id = req.params.id;
    const stockAlert = req.session.stockAlert;
    db.query("select * from goods where barcode = $1", [id], (err, items) => {
      db.query("select * from units", (err, data) => {
        if (err) {
          console.log(err);
        }
        res.render("goods/goodform", {
          data: items.rows[0],
          item: data.rows,
          renderFrom: "edit",
          user: req.session.user,
          stockAlert,
          error: req.flash("error"),
        });
      });
    });
  });

  router.post("/edit/:id", (req, res) => {
    const id = req.params.id;
    if (!req.files || Object.keys(req.files).length === 0) {
      db.query(
        "UPDATE goods SET barcode=$1, name=$2, stock=$3, purchaseprice=$4, sellingprice=$5, unit=$6 WHERE barcode=$7",
        [
          req.body.barcode,
          req.body.name,
          req.body.stock,
          req.body.purchaseprice,
          req.body.sellingprice,
          req.body.unit,
          id,
        ],
        function (err) {
          if (err) {
            console.error(err);
            req.flash("error", err.message);
            return res.redirect(`/goods/edit/${id}`);
          } else {
            res.redirect("/goods");
          }
        }
      );
      // return res.status(400).send("No files were uploaded.");
    } else {
      // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
      let picture = req.files.picture;
      pictureName = `${Date.now()}-${picture.name}`;
      let uploadPath = path.join(
        __dirname,
        "..",
        "public",
        "images",
        "pictures",
        pictureName
      );

      // Use the mv() method to place the file somewhere on your server
      picture.mv(uploadPath, function (err) {
        if (err) return res.status(500).send(err);
        db.query(
          "UPDATE goods SET barcode=$1, name=$2, stock=$3, purchaseprice=$4, sellingprice=$5, picture=$6, unit=$7 WHERE barcode=$8",
          [
            req.body.barcode,
            req.body.name,
            req.body.stock,
            req.body.purchaseprice,
            req.body.sellingprice,
            pictureName,
            req.body.unit,
            id,
          ],
          function (err) {
            if (err) {
              console.error(err);
              req.flash("error", err.message);
              return res.redirect(`/goods/edit/${id}`);
            } else {
              res.redirect("/goods");
            }
          }
        );
      });
    }
  });

  router.get("/delete/:id", (req, res) => {
    const id = req.params.id;
    db.query("delete from goods where barcode = $1", [id], (err) => {
      if (err) {
        console.log("hapus data Goods gagal");
        req.flash("error", err.message);
        return res.redirect(`/`);
      }
      res.redirect("/goods");
    });
  });

  return router;
};
