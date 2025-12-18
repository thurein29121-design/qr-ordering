// backend/middleware/auth.js
const jwt = require("jsonwebtoken");

function generateAdminToken(username) {
  const payload = { role: "admin", username };
  const secret = process.env.JWT_SECRET || "devsecret";
  return jwt.sign(payload, secret, { expiresIn: "1h" });
}

function requireAdmin(req, res, next) {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Missing token" });

    const secret = process.env.JWT_SECRET || "devsecret";
    const payload = jwt.verify(token, secret);
    if (payload.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }
    req.admin = payload;
    next();
  } catch (err) {
    console.error("Auth error:", err.message);
    return res.status(401).json({ error: "Invalid token" });
  }
}

module.exports = { generateAdminToken, requireAdmin };
