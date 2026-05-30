// ========== API CONFIG + STATE ==========
const API_BASE = "http://localhost:3000/api";
let cart = {};
let activeFilter = "all";
let searchTerm = "";
let selectedTable = null;
let placedOrders = [];
let reservations = [];

// ========== PAGE NAVIGATION ==========
function showPage(p) {
  document
    .querySelectorAll(".page")
    .forEach((x) => x.classList.remove("active"));
  document.getElementById("page-" + p).classList.add("active");
  document.querySelectorAll(".nav-tab").forEach((t, i) => {
    t.classList.toggle(
      "active",
      ["menu", "orders", "reserve", "admin"][i] === p,
    );
  });

  // Load data for each page
  if (p === "menu") loadMenu();
  if (p === "orders") loadOrders();
  if (p === "reserve") loadReservations();
  if (p === "admin") loadAdminDashboard();
}

// ========== MENU - BACKEND INTEGRATED ==========
async function loadMenu() {
  try {
    const params = new URLSearchParams({ category: activeFilter });
    if (searchTerm) params.append("search", searchTerm);

    const res = await fetch(`${API_BASE}/menu?${params}`);
    const menuData = await res.json();

    // Cache menu for cart rendering + order totals
    window.__MENU_CACHE__ = menuData.reduce((acc, it) => {
      acc[it.id] = it;
      return acc;
    }, {});

    renderMenu(menuData);
    updateHeroStats();
  } catch (err) {
    console.error("Menu load error:", err);
    showToast("Failed to load menu");
    renderMenu([]); // Fallback
  }
}

function renderMenu(items) {
  // Update cache too (handles cases where menu is filtered)
  window.__MENU_CACHE__ = items.reduce((acc, it) => {
    acc[it.id] = it;
    return acc;
  }, window.__MENU_CACHE__ || {});

  const cats = ["nonveg", "veg", "drinks"];
  const labels = {
    nonveg: "Non-Veg",
    veg: "Vegetarian",
    drinks: "Drinks & Beverages",
  };
  let html = "";

  cats.forEach((cat) => {
    const group = items.filter((i) => i.category === cat);
    if (!group.length) return;

    html += `<div class="section-title">${labels[cat]}</div><div class="menu-grid">`;
    group.forEach((item) => {
      const q = cart[item.id] || 0;
      const bgMap = { veg: "#1a2e1a", nonveg: "#2e1a1a", drinks: "#1a1e2e" };

      html += `
        <div class="food-card">
          <div class="food-img" style="background:${bgMap[item.category]}">
            ${getEmoji(item.name)}
            <span class="food-badge ${item.category === "nonveg" ? "badge-nonveg" : "badge-veg"}">
              ${item.category === "nonveg" ? "Non-Veg" : item.category === "drinks" ? "Drink" : "Veg"}
            </span>
            ${item.rating > 4.7 ? '<span class="badge-popular">Popular</span>' : ""}
          </div>
          <div class="food-info">
            <div class="food-name">${item.name}</div>
            <div class="food-desc">${item.description}</div>
            <div class="food-footer">
              <div>
                <div class="food-price">₹${item.price}</div>
                <div class="food-rating">★ ${item.rating || 4.5}</div>
              </div>
              ${
                q === 0
                  ? `<button class="add-btn" onclick="addToCart(${item.id}, event)">+</button>`
                  : `
                  <div class="qty-ctrl">
                    <button class="qty-btn" onclick="removeFromCart(${item.id}, event)">−</button>
                    <span class="qty-num">${q}</span>
                    <button class="qty-btn" onclick="addToCart(${item.id}, event)">+</button>
                  </div>
                `
              }
            </div>
          </div>
        </div>`;
    });
    html += "</div>";
  });

  document.getElementById("menu-content").innerHTML =
    html ||
    '<div style="padding:40px;text-align:center;color:var(--text3)">No items found</div>';
}

async function updateHeroStats() {
  try {
    const res = await fetch(`${API_BASE}/menu/stats`);
    const stats = await res.json();
    const statEls = document.querySelectorAll(".hero-stats .stat-num");
    if (statEls[0]) statEls[0].textContent = stats.totalItems;
    if (statEls[1]) statEls[1].textContent = stats.avgRating + "★";
    if (statEls[2]) statEls[2].textContent = stats.avgDelivery + "min";
  } catch (err) {
    console.error("Stats error:", err);
  }
}

// ========== SEARCH & FILTER ==========
function filterMenu() {
  searchTerm = document.getElementById("search-input").value.toLowerCase();
  loadMenu();
}

function setFilter(f, el) {
  activeFilter = f;
  document
    .querySelectorAll(".chip")
    .forEach((c) => c.classList.remove("active"));
  el.classList.add("active");
  loadMenu();
}

// ========== CART FUNCTIONS ==========
function addToCart(id, event) {
  if (event) event.stopPropagation();

  cart[id] = (cart[id] || 0) + 1;
  updateCart();
  loadMenu(); // Refresh menu to show quantity
  showToast("Added to cart");
}

function removeFromCart(id, event) {
  if (event) event.stopPropagation();
  if (cart[id] > 1) cart[id]--;
  else delete cart[id];
  updateCart();
  loadMenu();
}

function updateCart() {
  const total = Object.values(cart).reduce((a, b) => a + b, 0);
  document.getElementById("cart-count").textContent = total;
  renderCartPanel();
}

function renderCartPanel() {
  const items = Object.entries(cart);
  const el = document.getElementById("cart-items");
  const footer = document.getElementById("cart-footer");

  if (!items.length) {
    el.innerHTML =
      '<div class="empty-cart"><div class="empty-cart-icon">🛒</div><div>Your cart is empty</div></div>';
    footer.innerHTML = "";
    return;
  }

  // menu items cache (filled in renderMenu)
  let subtotal = 0;
  let html = "";

  items.forEach(([id, q]) => {
    const menuItem = (window.__MENU_CACHE__ || {})[parseInt(id, 10)];
    const item = menuItem || {
      id: parseInt(id, 10),
      name: `Item ${id}`,
      price: 0,
    };

    const line = item.price * q;
    subtotal += line;

    html += `
      <div class="cart-item">
        <div class="cart-item-emoji">${getEmoji(item.name)}</div>
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-price">₹${item.price} × ${q}</div>
        </div>
        <div style="font-weight:600;font-size:13px">₹${line}</div>
      </div>`;
  });

  el.innerHTML = html;
  const tax = Math.round(subtotal * 0.05);
  footer.innerHTML = `
    <div class="cart-total-row"><span style="color:var(--text2)">Subtotal</span><span>₹${subtotal}</span></div>
    <div class="cart-total-row"><span style="color:var(--text2)">GST (5%)</span><span>₹${tax}</span></div>
    <div class="cart-total-row main">
      <span>Total</span><span style="color:var(--accent2)">₹${subtotal + tax}</span>
    </div>
    <button class="btn-primary" style="width:100%;margin-top:14px" onclick="placeOrder()">Place Order</button>`;
}

async function placeOrder() {
  if (!Object.keys(cart).length) {
    showToast("Cart is empty");
    return;
  }

  try {
    const orderItems = Object.entries(cart).map(([id, qty]) => ({
      id: parseInt(id),
      quantity: qty,
    }));

    const res = await fetch(`${API_BASE}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_name: "Guest Customer",
        items: orderItems,
        total_amount: (() => {
          const subtotal = Object.entries(cart).reduce((sum, [id, qty]) => {
            const menuItem = (window.__MENU_CACHE__ || {})[parseInt(id, 10)];
            const price = menuItem ? Number(menuItem.price || 0) : 0;
            return sum + price * qty;
          }, 0);
          const tax = Math.round(subtotal * 0.05);
          return subtotal + tax;
        })(),
      }),
    });

    if (res.ok) {
      cart = {};
      updateCart();
      toggleCart();
      showToast("Order placed successfully! 🎉");
      loadOrders();
      showPage("orders");
    }
  } catch (err) {
    showToast("Failed to place order");
  }
}

function toggleCart() {
  document.getElementById("cart-panel").classList.toggle("open");
  document.getElementById("cart-overlay").classList.toggle("open");
}

// ========== ORDERS PAGE ==========
async function loadOrders() {
  try {
    const res = await fetch(`${API_BASE}/orders`);
    placedOrders = await res.json();
    renderOrders();
  } catch (err) {
    console.error("Orders error:", err);
    placedOrders = [];
    renderOrders();
  }
}

function renderOrders() {
  const statMap = {
    pending: "⏳ Pending",
    preparing: "👨‍🍳 Preparing",
    delivery: "🚚 Out for delivery",
    complete: "✅ Completed",
  };
  const clsMap = {
    pending: "status-pending",
    preparing: "status-preparing",
    delivery: "status-delivery",
    complete: "status-complete",
  };
  const pMap = { pending: 15, preparing: 50, delivery: 80, complete: 100 };

  const el = document.getElementById("orders-list");
  if (!placedOrders.length) {
    el.innerHTML =
      '<div style="text-align:center;padding:40px;color:var(--text3)">No orders yet</div>';
    return;
  }

  el.innerHTML = placedOrders
    .map(
      (o) => `
    <div class="order-card">
      <div class="order-header">
        <div>
          <div class="order-id">#${o.id}</div>
          <div class="order-time">${new Date(o.order_time).toLocaleString()}</div>
        </div>
        <div class="status-badge ${clsMap[o.status || "pending"]}">${statMap[o.status || "pending"]}</div>
      </div>
      <div class="order-items">${JSON.parse(o.items || "[]")[0]?.name || "Items"}</div>
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px">
        <span style="color:var(--text2)">Total</span>
        <span style="font-weight:700;color:var(--accent2)">₹${o.total_amount}</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width:${pMap[o.status || "pending"]}%"></div>
      </div>
      <div class="progress-labels">
        <span class="progress-label">Placed</span>
        <span class="progress-label">Preparing</span>
        <span class="progress-label">On Way</span>
        <span class="progress-label">Done</span>
      </div>
    </div>
  `,
    )
    .join("");
}

// ========== RESERVATIONS ==========
async function loadReservations() {
  try {
    const [resRes, tableRes] = await Promise.all([
      fetch(`${API_BASE}/reservations`),
      fetch(`${API_BASE}/tables`),
    ]);
    reservations = await resRes.json();
    const tables = await tableRes.json();
    renderReserve(tables);
  } catch (err) {
    console.error("Reservations error:", err);
    renderReserve([]); // Fallback
  }
}

function renderReserve(tables = []) {
  document.getElementById("table-grid").innerHTML = tables
    .map(
      (t) => `
    <div class="table-slot ${t.available ? "" : "occupied"} ${selectedTable === t.number ? "selected" : ""}" 
         onclick="${t.available ? `selectTable('${t.number}')` : ""}">
      <div class="table-num">${t.number}</div>
      <div class="table-cap">${t.capacity}P</div>
    </div>
  `,
    )
    .join("");

  document.getElementById("res-list").innerHTML = reservations.length
    ? reservations
        .map(
          (r) => `
      <div class="res-item">
        <div style="font-size:22px">🍽️</div>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:600">${r.customer_name}</div>
          <div style="font-size:11px;color:var(--text3)">${r.guests} guests · ${r.time}</div>
        </div>
        <div>
          <div style="font-size:12px;font-weight:600;color:var(--accent2)">Table ${r.table_number}</div>
          <div style="font-size:11px;color:var(--text3)">${r.date}</div>
        </div>
      </div>
    `,
        )
        .join("")
    : '<div style="padding:20px;text-align:center;color:var(--text3)">No reservations</div>';
}

function selectTable(n) {
  selectedTable = n;
  loadReservations(); // Refresh to show selection
}

async function makeReservation() {
  const name = document.getElementById("res-name").value.trim();
  if (!name) {
    showToast("Please enter your name");
    return;
  }
  if (!selectedTable) {
    showToast("Please select a table");
    return;
  }

  try {
    const data = {
      customer_name: name,
      date: document.getElementById("res-date").value,
      time: document.getElementById("res-time").value,
      guests: document.getElementById("res-guests").value,
      table_number: selectedTable,
    };

    const res = await fetch(`${API_BASE}/reservations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      selectedTable = null;
      document.getElementById("res-name").value = "";
      showToast("Reservation confirmed! 🎉");
      loadReservations();
    }
  } catch (err) {
    showToast("Reservation failed");
  }
}

// ========== ADMIN DASHBOARD ==========
async function loadAdminDashboard() {
  try {
    const [statsRes, popularRes, liveRes] = await Promise.all([
      fetch(`${API_BASE}/admin/stats`),
      fetch(`${API_BASE}/admin/popular-items`),
      fetch(`${API_BASE}/admin/live-orders`),
    ]);

    const stats = await statsRes.json();
    const popular = await popularRes.json();
    const liveOrders = await liveRes.json();

    // Update metrics
    const metrics = document.querySelectorAll(".metric-val");
    metrics[0].textContent = stats.ordersToday;
    metrics[1].textContent = `₹${stats.revenueToday.toFixed(0)}`;
    metrics[2].textContent = stats.customersToday;
    metrics[3].textContent = stats.avgRating;

    renderPopularItems(popular);
    document.getElementById("admin-orders").innerHTML = liveOrders.length
      ? liveOrders
          .map(
            (o) =>
              `<div class="order-row"><span>#${o.id}</span><select class="select-status"><option>Pending</option></select></div>`,
          )
          .join("")
      : '<div style="color:var(--text3);font-size:12px;padding:20px">No live orders</div>';
  } catch (err) {
    console.error("Admin error:", err);
  }
}

function renderPopularItems(items) {
  document.getElementById("popular-chart").innerHTML = items
    .map(
      (item) => `
    <div class="bar-row">
      <div class="bar-label">${item.name}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${item.percentage}%"></div></div>
      <div class="bar-val">${item.sales}</div>
    </div>
  `,
    )
    .join("");
}

// ========== UTILITIES ==========
function getEmoji(name) {
  const emojis = {
    Chicken: "🍗",
    Paneer: "🧀",
    Dal: "🫕",
    Biryani: "🍚",
    Lassi: "🥭",
    Chai: "☕",
    Roti: "🫓",
    Fish: "🐟",
    Mutton: "🐑",
  };
  return Object.keys(emojis).some((k) => name.includes(k))
    ? emojis[name.split(" ")[0]]
    : "🍽️";
}

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2200);
}

// ========== INIT ==========
document.addEventListener("DOMContentLoaded", () => {
  // Search input
  document.getElementById("search-input").addEventListener("input", filterMenu);

  // Initial load
  loadMenu();

  // Set today's date
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("res-date").value = today;
});
