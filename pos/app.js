var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
const { Pool } = require("pg");
var session = require("express-session");
var flash = require("connect-flash");
const fileUpload = require("express-fileupload");

const pool = new Pool({
  user: "yurza",
  host: "localhost",
  database: "posdb",
  password: "1234",
  port: 5432,
});

var indexRouter = require("./routes/index")(pool);
var usersRouter = require("./routes/users")(pool);
var unitsRouter = require("./routes/units")(pool);
var goodsRouter = require("./routes/goods")(pool);

var app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: "rubicamp",
    resave: false,
    saveUninitialized: true,
  })
);
app.use(flash());
//default options
app.use(fileUpload());

app.use("/", indexRouter);
app.use("/", usersRouter);
app.use("/", unitsRouter);
app.use("/", goodsRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
