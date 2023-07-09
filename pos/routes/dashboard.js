var express = require("express");
var router = express.Router();
const isLoggedIn = require("../helpers/util");
const isAdmin = require("../helpers/utill");

module.exports = function (db) {
  router.get("/dataearn", async (req, res) => {
    let params = [];

    if (req.query.search?.value) {
      params.push(
        `TRIM(TO_CHAR(to_timestamp(EXTRACT(MONTH FROM time)::text, 'MM'), 'Month')) ILIKE '%${req.query.search.value}%'`
      );
    }

    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    if (startDate && endDate) {
      // Jika startDate dan endDate terisi, tambahkan parameter query
      params.push(`time >= '${startDate}' AND time <= '${endDate}'`);
    } else if (startDate) {
      // Jika hanya startDate terisi, tambahkan parameter query
      params.push(`time >= '${startDate}'`);
    } else if (endDate) {
      // Jika hanya endDate terisi, tambahkan parameter query
      params.push(`time <= '${endDate}'`);
    }

    const draw = Number(req.query.draw);
    const start = Number(req.query.start);
    const length = Number(req.query.length);
    const sortByColumnIndex = Number(req.query.order?.[0]?.column ?? 0);
    const sortMode = req.query.order?.[0]?.dir;

    const sortByColumnName =
      req.query.columns?.[sortByColumnIndex]?.data ?? "defaultColumnName";

    const sortBy =
      sortByColumnName === "month_name"
        ? `EXTRACT(MONTH FROM time) ${sortMode}`
        : `${sortByColumnName} ${sortMode}`;

    const totalQuery = `SELECT COUNT(*) AS total FROM (
      SELECT time, totalsum, 'purchases' AS table_name FROM purchases
      UNION ALL
      SELECT time, totalsum, 'sales' AS table_name FROM sales
    ) AS combined_data`;

    const filteredTotalQuery = `SELECT COUNT(*) AS total FROM (
  SELECT time, totalsum, 'purchases' AS table_name FROM purchases
  UNION ALL
  SELECT time, totalsum, 'sales' AS table_name FROM sales
  ${params.length > 0 ? ` WHERE ${params.join(" AND ")}` : ""}
) AS combined_data
${params.length > 0 ? ` WHERE ${params.join(" AND ")}` : ""}
GROUP BY EXTRACT(MONTH FROM time)`;

    const totalResult = await db.query(totalQuery);
    const filteredTotalResult = await db.query(filteredTotalQuery);

    const total = totalResult.rows[0] ? totalResult.rows[0].total : 0;
    const filteredTotal =
      filteredTotalResult.rows.length > 0 ? filteredTotalResult.rows.length : 0;

    const dataQuery = `SELECT CONCAT(
            TRIM(TO_CHAR(to_timestamp(EXTRACT(MONTH FROM time)::text, 'MM'), 'Month')),
            ' ',
            TO_CHAR(MIN(time), 'DD')
          ) AS month_name,
          COALESCE(SUM(CASE WHEN table_name = 'purchases' THEN totalsum ELSE 0 END), 0) AS expense,
          COALESCE(SUM(CASE WHEN table_name = 'sales' THEN totalsum ELSE 0 END), 0) AS revenue,
          (COALESCE(SUM(CASE WHEN table_name = 'sales' THEN totalsum ELSE 0 END), 0) -
           COALESCE(SUM(CASE WHEN table_name = 'purchases' THEN totalsum ELSE 0 END), 0)) AS earnings
    FROM (
      SELECT time, totalsum, 'purchases' AS table_name FROM purchases
      UNION ALL
      SELECT time, totalsum, 'sales' AS table_name FROM sales
    ) AS combined_data
    ${params.length > 0 ? `WHERE ${params.join(" AND ")}` : ""}
    GROUP BY EXTRACT(MONTH FROM time)
    HAVING ${params.length > 0 ? `COUNT(*) > 0` : `1=1`}
    ORDER BY ${sortBy}
    LIMIT ${length} OFFSET ${start}`;

    const dataResult = await db.query(dataQuery);
    const data = dataResult.rows;

    const response = {
      draw,
      recordsTotal: total,
      recordsFiltered: filteredTotal,
      data,
    };
    res.json(response);
  });

  router.get("/", isLoggedIn, isAdmin, function (req, res, next) {
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
          const saled = item.rows.length;
          const fill = item.rows;
          var directCount = 0;
          var customerCount = 0;

          fill.forEach(function (item) {
            if (item.customer === 4) {
              directCount++;
            } else {
              customerCount++;
            }
          });

          res.render("dashboard", {
            totalSum,
            totalSale,
            earnings,
            saled,
            user: req.session.user,
            stockAlert,
          });
        });
      });
    });
  });

  router.get("/piechart", function (req, res, next) {
    db.query("select * from sales", (err, item) => {
      res.json(item.rows);
    });
  });

  return router;
};
