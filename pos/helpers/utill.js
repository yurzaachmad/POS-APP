const isAdmin = function (req, res, next) {
  if (req.session.user && req.session.user.role === "admin") {
    next();
  } else {
    res.redirect("/login");
  }
};

module.exports = isAdmin;
