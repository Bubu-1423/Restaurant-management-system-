const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, './database.sqlite');
const db = new sqlite3.Database(dbPath);

function initDatabase() {
  // Menu Items
  db.run(`CREATE TABLE IF NOT EXISTS menu_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    category TEXT NOT NULL,
    image TEXT,
    rating REAL DEFAULT 4.5,
    is_available BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Orders
  db.run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT,
    items TEXT NOT NULL,
    total_amount REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    order_time DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Reservations
  db.run(`CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    guests TEXT NOT NULL,
    table_number TEXT,
    status TEXT DEFAULT 'confirmed',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Insert Sample Menu Data (Tera menuData converted)
  const sampleMenu = [
    ['Butter Chicken', 'Creamy tomato-based curry with tender chicken', 320, 'nonveg', 4.8],
    ['Paneer Tikka', 'Grilled cottage cheese cubes in spices', 280, 'veg', 4.7],
    ['Chicken Biryani', 'Fragrant basmati rice with marinated chicken', 380, 'nonveg', 4.9],
    ['Dal Makhani', 'Slow-cooked black lentils with butter & cream', 220, 'veg', 4.6],
    ['Mango Lassi', 'Chilled yogurt drink with fresh mango', 120, 'drinks', 4.8],
    ['Tandoori Roti', 'Freshly baked clay oven bread', 45, 'veg', 4.5],
    ['Fish Curry', 'Coastal spiced fish in coconut gravy', 420, 'nonveg', 4.7],
    ['Masala Chai', 'Spiced Indian milk tea with cardamom', 60, 'drinks', 4.9],
    ['Veg Fried Rice', 'Wok-tossed rice with fresh vegetables', 200, 'veg', 4.5],
    ['Mutton Rogan Josh', 'Aromatic Kashmiri lamb curry', 480, 'nonveg', 4.8],
    ['Palak Paneer', 'Spinach & cottage cheese in creamy gravy', 260, 'veg', 4.6],
    ['Cold Coffee', 'Blended iced coffee with cream', 150, 'drinks', 4.7]
  ];

  // Clear & Insert
  db.run('DELETE FROM menu_items');
  const stmt = db.prepare('INSERT INTO menu_items (name, description, price, category, rating) VALUES (?, ?, ?, ?, ?)');
  sampleMenu.forEach(([name, desc, price, cat, rating]) => {
    stmt.run([name, desc, price, cat, rating]);
  });
  stmt.finalize();

  console.log('✅ Database ready with 12 menu items!');
}

module.exports = { db, initDatabase };