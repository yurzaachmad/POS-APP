const isAdmin = function (req, res, next) {
  if (req.session.user.role === "admin") {
    next();
  } else {
    res.status(403).send("Akses ditolak");
  }
};

module.exports = isAdmin;
