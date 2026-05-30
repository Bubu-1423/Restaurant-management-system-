const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const { db, initDatabase } = require("./database");

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));
// Frontend files (index.html, script.js, style.css) repo root me hain
app.use(express.static(__dirname));

// Initialize Database
initDatabase();

// === MENU APIs ===
app.get("/api/menu", (req, res) => {
  const { search, category } = req.query;
  let query = "SELECT * FROM menu_items WHERE is_available = 1";
  let params = [];

  if (search) {
    query += " AND (name LIKE ? OR description LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }
  if (category && category !== "all") {
    query += " AND category = ?";
    params.push(category);
  }
  query += " ORDER BY rating DESC";

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get("/api/menu/stats", (req, res) => {
  db.get(
    "SELECT COUNT(*) as total, AVG(rating) as avg_rating FROM menu_items WHERE is_available = 1",
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({
        totalItems: row.total,
        avgRating: parseFloat(row.avg_rating || 0).toFixed(1),
        avgDelivery: "25",
      });
    },
  );
});

// === ORDERS APIs ===
app.get("/api/orders", (req, res) => {
  db.all(
    "SELECT * FROM orders ORDER BY order_time DESC LIMIT 20",
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      rows.forEach((row) => {
        try {
          row.items = JSON.parse(row.items);
        } catch (e) {
          row.items = [];
        }
      });
      res.json(rows);
    },
  );
});

app.post("/api/orders", (req, res) => {
  const { customer_name, items, total_amount } = req.body;
  if (!items || !total_amount) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  db.run(
    "INSERT INTO orders (customer_name, items, total_amount) VALUES (?, ?, ?)",
    [customer_name || "Guest", JSON.stringify(items), total_amount],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, success: true });
    },
  );
});

// === RESERVATIONS APIs ===
app.get("/api/reservations", (req, res) => {
  db.all(
    "SELECT * FROM reservations ORDER BY created_at DESC LIMIT 10",
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    },
  );
});

app.get("/api/tables", (req, res) => {
  res.json([
    { id: 1, number: "T1", capacity: 2, available: true },
    { id: 2, number: "T2", capacity: 4, available: false },
    { id: 3, number: "T3", capacity: 6, available: true },
    { id: 4, number: "T4", capacity: 4, available: true },
    { id: 5, number: "T5", capacity: 8, available: false },
    { id: 6, number: "T6", capacity: 2, available: true },
    { id: 7, number: "T7", capacity: 4, available: true },
    { id: 8, number: "T8", capacity: 6, available: false },
  ]);
});

app.post("/api/reservations", (req, res) => {
  const { customer_name, date, time, guests, table_number } = req.body;
  if (!customer_name || !date || !table_number) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  db.run(
    "INSERT INTO reservations (customer_name, date, time, guests, table_number) VALUES (?, ?, ?, ?, ?)",
    [customer_name, date, time, guests, table_number],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, success: true });
    },
  );
});

// === ADMIN DASHBOARD APIs ===
app.get("/api/admin/stats", (req, res) => {
  const today = new Date().toISOString().split("T")[0];

  db.all(
    "SELECT COUNT(*) as ordersToday, SUM(total_amount) as revenueToday, COUNT(DISTINCT customer_name) as customersToday FROM orders WHERE DATE(order_time) = ?",
    [today],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      const stats = rows[0] || {};
      db.get(
        "SELECT AVG(rating) as avg_rating FROM menu_items",
        (err2, row2) => {
          res.json({
            ordersToday: stats.ordersToday || 0,
            revenueToday: parseFloat(stats.revenueToday || 0),
            customersToday: stats.customersToday || 0,
            avgRating: parseFloat(row2.avg_rating || 0).toFixed(1),
          });
        },
      );
    },
  );
});

app.get("/api/admin/popular-items", (req, res) => {
  res.json([
    { name: "Butter Chicken", sales: 45, percentage: 35 },
    { name: "Chicken Biryani", sales: 32, percentage: 25 },
    { name: "Paneer Tikka", sales: 28, percentage: 22 },
    { name: "Dal Makhani", sales: 20, percentage: 15 },
  ]);
});

app.get("/api/admin/live-orders", (req, res) => {
  db.all(
    'SELECT * FROM orders WHERE status IN ("pending", "preparing") ORDER BY order_time DESC LIMIT 5',
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    },
  );
});

// Serve Frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Restaurant Backend running on http://localhost:${PORT}`);
  console.log(`📁 Database: ${path.join(__dirname, "database.sqlite")}`);
  console.log(`📂 Frontend: http://localhost:${PORT}`);
  console.log(`\n✅ Ready! Open browser aur test kar! 🔥\n`);
});
