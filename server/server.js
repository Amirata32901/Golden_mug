const express = require("express");
const session = require("express-session");
const PgSession = require("connect-pg-simple")(session);
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const app = express();
app.set("trust proxy", 1);
app.use(express.json({ limit: "20kb" }));

const FRONTEND_ORIGIN = (process.env.FRONTEND_ORIGIN || "https://amirata32901.github.io").replace(/\/$/, "");
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined
});

app.use(cors({
  origin(origin, callback) {
    if (!origin || origin.replace(/\/$/, "") === FRONTEND_ORIGIN) return callback(null, true);
    return callback(new Error("Origin not allowed"));
  },
  credentials: true,
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

app.use(session({
  store: new PgSession({ pool, tableName: "user_sessions", createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  name: "goldenmug.sid",
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 12, standardHeaders: true, legacyHeaders: false });
const chatLimiter = rateLimit({ windowMs: 60 * 1000, limit: 50, standardHeaders: true, legacyHeaders: false });

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      full_name VARCHAR(80) NOT NULL,
      email VARCHAR(254) NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS cart_items (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      product_id VARCHAR(120) NOT NULL,
      product_name VARCHAR(180) NOT NULL,
      unit_price INTEGER NOT NULL CHECK (unit_price >= 0),
      quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity BETWEEN 1 AND 50),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, product_id)
    );
  `);
}

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: "برای ادامه ابتدا وارد حساب کاربری شو." });
  next();
}

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.post("/api/register", authLimiter, async (req, res) => {
  try {
    const fullName = String(req.body.fullName || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    if (fullName.length < 2 || fullName.length > 80) return res.status(400).json({ error: "نام باید بین ۲ تا ۸۰ حرف باشد." });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return res.status(400).json({ error: "ایمیل معتبر وارد کن." });
    if (password.length < 8 || password.length > 72) return res.status(400).json({ error: "رمز عبور باید حداقل ۸ کاراکتر باشد." });
    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      "INSERT INTO users(full_name,email,password_hash) VALUES($1,$2,$3) RETURNING id,full_name,email",
      [fullName, email, hash]
    );
    req.session.userId = result.rows[0].id;
    req.session.userName = result.rows[0].full_name;
    req.session.save(err => err ? res.status(500).json({ error: "ساخت نشست کاربری ناموفق بود." }) : res.status(201).json({ user: { id: result.rows[0].id, fullName: result.rows[0].full_name, email: result.rows[0].email } }));
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "این ایمیل قبلاً ثبت شده است؛ وارد حساب شو." });
    console.error(err);
    res.status(500).json({ error: "ثبت‌نام انجام نشد. کمی بعد دوباره تلاش کن." });
  }
});

app.post("/api/login", authLimiter, async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const result = await pool.query("SELECT id,full_name,email,password_hash FROM users WHERE email=$1", [email]);
    if (!result.rowCount || !(await bcrypt.compare(password, result.rows[0].password_hash))) {
      return res.status(401).json({ error: "ایمیل یا رمز عبور درست نیست." });
    }
    req.session.regenerate(err => {
      if (err) return res.status(500).json({ error: "ورود انجام نشد." });
      req.session.userId = result.rows[0].id;
      req.session.userName = result.rows[0].full_name;
      req.session.save(saveErr => saveErr ? res.status(500).json({ error: "ورود انجام نشد." }) : res.json({ user: { id: result.rows[0].id, fullName: result.rows[0].full_name, email: result.rows[0].email } }));
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "خطای سرور هنگام ورود." });
  }
});

app.get("/api/me", requireAuth, async (req, res) => {
  const result = await pool.query("SELECT id,full_name,email FROM users WHERE id=$1", [req.session.userId]);
  if (!result.rowCount) return res.status(401).json({ error: "حساب پیدا نشد." });
  res.json({ user: { id: result.rows[0].id, fullName: result.rows[0].full_name, email: result.rows[0].email } });
});

app.post("/api/logout", requireAuth, (req, res) => {
  req.session.destroy(() => res.clearCookie("goldenmug.sid", { httpOnly: true, secure: true, sameSite: "none" }).json({ ok: true }));
});

app.get("/api/cart", requireAuth, async (req, res) => {
  const result = await pool.query(
    "SELECT product_id AS \"productId\", product_name AS name, unit_price AS price, quantity FROM cart_items WHERE user_id=$1 ORDER BY created_at DESC",
    [req.session.userId]
  );
  res.json({ items: result.rows });
});

app.post("/api/cart", requireAuth, async (req, res) => {
  const productId = String(req.body.productId || "").trim();
  const name = String(req.body.name || "").trim();
  const price = Number(req.body.price);
  const quantity = Math.max(1, Math.min(50, Number.parseInt(req.body.quantity || 1, 10)));
  if (!productId || productId.length > 120 || !name || name.length > 180 || !Number.isSafeInteger(price) || price < 0) {
    return res.status(400).json({ error: "اطلاعات محصول معتبر نیست." });
  }
  const result = await pool.query(`
    INSERT INTO cart_items(user_id,product_id,product_name,unit_price,quantity)
    VALUES($1,$2,$3,$4,$5)
    ON CONFLICT(user_id,product_id)
    DO UPDATE SET quantity=LEAST(cart_items.quantity + EXCLUDED.quantity,50)
    RETURNING product_id AS "productId", product_name AS name, unit_price AS price, quantity
  `, [req.session.userId, productId, name, price, quantity]);
  res.status(201).json({ item: result.rows[0] });
});

app.delete("/api/cart/:productId", requireAuth, async (req, res) => {
  await pool.query("DELETE FROM cart_items WHERE user_id=$1 AND product_id=$2", [req.session.userId, req.params.productId]);
  res.json({ ok: true });
});

app.delete("/api/cart", requireAuth, async (req, res) => {
  await pool.query("DELETE FROM cart_items WHERE user_id=$1", [req.session.userId]);
  res.json({ ok: true });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "خطای ارتباط با سرور." });
});

const port = process.env.PORT || 3000;
initDb().then(() => app.listen(port, () => console.log("Golden Mug API listening on " + port)))
  .catch(err => { console.error("Database initialization failed", err); process.exit(1); });
