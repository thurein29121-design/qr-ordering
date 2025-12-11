// ===================== Verify table status first =====================
(async () => {
  const tableNo = localStorage.getItem("tasteqr_table");
  if (!tableNo) {
    window.location.href = "index.html";
    return;
  }

  
  try {
    const res = await fetch(`/api/tables/${tableNo}/status`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (!data.active) {
      alert("⚠️ Your table is closed. Please re-enter your table number.");
      localStorage.removeItem("tasteqr_table");
      window.location.href = "index.html";
    }
  } catch (e) {
    console.error("Failed to verify table status:", e);
    alert("Server error while checking table status.");
    window.location.href = "index.html";
  }
})();


// ===================== Cart logic =====================
const backBtn = document.getElementById("backBtn");
const cartList = document.getElementById("cartList");
const subtotal = document.getElementById("subtotal");
const checkoutBtn = document.getElementById("checkoutBtn");

const tableNo = localStorage.getItem("tasteqr_table") || "999";
let cart = JSON.parse(localStorage.getItem("cart")) || [];

// helper: compute unit price including extras
function calculateItemUnitPrice(item) {
  const base = Number(item.price) || 0;
  const sizeExtra = Number(item.sizeExtra || 0);
  const juiceExtra = Number(
    item.juicePrice != null
      ? item.juicePrice
      : (item.juice && item.juice.price) || 0
  );
  const addonsExtra = (item.addons || []).reduce(
    (sum, a) => sum + Number(a.price || 0),
    0
  );
  return base + sizeExtra + juiceExtra + addonsExtra;
}

// 🧾 Render cart items
function renderCart() {
  cartList.innerHTML = "";
  let total = 0;

  if (cart.length === 0) {
    cartList.innerHTML =
      "<p style='text-align:center;color:#777;'>Your cart is empty.</p>";
    subtotal.textContent = "¥0.00";
    return;
  }

  cart.forEach((item, i) => {
    const unitPrice = calculateItemUnitPrice(item);
    const lineTotal = unitPrice * item.qty;
    total += lineTotal;

    const details = [
      item.size ? `(${item.size})` : "",
      item.spice ? `${item.spice}` : "",
      item.juice?.name ? ` ${item.juice.name}` : "",
      item.addons && item.addons.length > 0
        ? item.addons.map(a => `+${a.name}`).join(" ")
        : ""
    ]
      .filter(x => x !== "")
      .join(", ");

    const div = document.createElement("div");
    div.className = "cart-item";
    div.innerHTML = `
      <img src="${item.image || ""}" alt="${item.name}">
      <div class="cart-info">
        <h4>${item.name} <small>${details}</small></h4>
        <p>¥${unitPrice.toFixed(2)}</p>
        <div class="qty-box">
          <button onclick="changeQty(${i}, -1)">−</button>
          <span>${item.qty}</span>
          <button onclick="changeQty(${i}, 1)">＋</button>
        </div>
      </div>
    `;

    cartList.appendChild(div);
  });

  subtotal.textContent = `¥${total.toFixed(2)}`;
}

// 🔄 Change quantity
function changeQty(index, delta) {
  cart[index].qty += delta;
  if (cart[index].qty <= 0) cart.splice(index, 1);
  localStorage.setItem("cart", JSON.stringify(cart));
  renderCart();
}

// ✅ Checkout (acts like “Place Order”)
checkoutBtn.addEventListener("click", async () => {
  if (cart.length === 0) {
    alert("Your cart is empty!");
    return;
  }

  checkoutBtn.disabled = true;
  checkoutBtn.textContent = "Placing...";

  const itemsPayload = cart.map(i => {
    const unitPrice = calculateItemUnitPrice(i);
    const qty = Number(i.qty || 0);
    return {
      name: i.name,
      price: Number(i.price),          // base price
      qty,
      size: i.size || null,
      spice: i.spice || null,
      juice: i.juice || null,
      addons: i.addons || [],
      sizeExtra: Number(i.sizeExtra || 0),
      juicePrice: Number(
        i.juicePrice != null
          ? i.juicePrice
          : (i.juice && i.juice.price) || 0
      ),
      subtotal: unitPrice * qty        // full line subtotal (base + extras)
    };
  });

  const total = cart.reduce(
    (sum, i) => sum + calculateItemUnitPrice(i) * Number(i.qty || 0),
    0
  );

  // ✅ Match backend API: tableNo / total
  const payload = {
    tableNo,
    items: itemsPayload,
    total
  };

  try {
    const res = await fetch("/api/order/new", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (data.success) {
      localStorage.removeItem("cart");
      window.location.href = `payment.html?orderId=${encodeURIComponent(
        data.orderId
      )}&table=${encodeURIComponent(tableNo)}`;
    } else {
      alert("❌ Order failed: " + (data.error || "Unknown error"));
    }
  } catch (e) {
    console.error("❌ Checkout error:", e);
    alert("Error connecting to server or invalid JSON.");
  } finally {
    checkoutBtn.disabled = false;
    checkoutBtn.textContent = "Checkout";
  }
});

// ⬅ Back to menu
backBtn.addEventListener("click", () => (window.location.href = "main.html"));

// Initialize
renderCart();
