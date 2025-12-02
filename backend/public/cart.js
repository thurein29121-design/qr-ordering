// ===============================
// CART SYSTEM
// ===============================

// Load cart from localStorage or empty
let cart = JSON.parse(localStorage.getItem("cart")) || [];

// Save cart to localStorage
function saveCart() {
    localStorage.setItem("cart", JSON.stringify(cart));
}

// ===============================
// ADD ITEM TO CART
// ===============================
function addToCart(item) {
    // Check if same item (same name + same size)
    const existing = cart.find(
        (i) =>
            i.name === item.name &&
            i.size === item.size &&
            JSON.stringify(i.addons) === JSON.stringify(item.addons) &&
            i.spice === item.spice &&
            i.juice?.name === item.juice?.name
    );

    if (existing) {
        existing.qty += item.qty;
    } else {
        cart.push(item);
    }

    saveCart();
    updateCartButton();
}

// Update cart count bubble
function updateCartButton() {
    const count = cart.reduce((sum, i) => sum + i.qty, 0);
    const btn = document.getElementById("cartCount");
    if (btn) btn.textContent = count;
}

updateCartButton();

// ===============================
// RENDER CART PAGE
// ===============================
function renderCart() {
    const container = document.getElementById("cartItems");
    const totalPriceEl = document.getElementById("totalPrice");

    if (!container) return;

    container.innerHTML = "";
    let total = 0;

    cart.forEach((item, index) => {
        const itemTotal = item.subtotal;
        total += itemTotal;

        const div = document.createElement("div");
        div.className = "cart-item";

        div.innerHTML = `
            <div class="cart-left">
                <h3>${item.name}</h3>
                <p>¥${item.price}</p>
                ${item.size ? `<p>Size: ${item.size}</p>` : ""}
                ${item.spice ? `<p>Spice: ${item.spice}</p>` : ""}
                ${item.juice?.name ? `<p>Juice: ${item.juice.name}</p>` : ""}
                ${item.addons?.length
                    ? `<p>Addons: ${item.addons.map(a => a.name).join(", ")}</p>`
                    : ""}
            </div>

            <div class="cart-right">
                <div class="qty-controls">
                    <button onclick="changeQty(${index}, -1)">-</button>
                    <span>${item.qty}</span>
                    <button onclick="changeQty(${index}, 1)">+</button>
                </div>
                <h3>¥${itemTotal}</h3>
                <button class="remove-btn" onclick="removeItem(${index})">🗑</button>
            </div>
        `;

        container.appendChild(div);
    });

    totalPriceEl.textContent = `¥${total}`;
}

// ===============================
// CHANGE QUANTITY
// ===============================
function changeQty(index, amount) {
    cart[index].qty += amount;
    if (cart[index].qty <= 0) cart.splice(index, 1);

    // Recalculate subtotal
    cart = cart.map((i) => ({
        ...i,
        subtotal: i.price * i.qty,
    }));

    saveCart();
    renderCart();
    updateCartButton();
}

// ===============================
// REMOVE ITEM
// ===============================
function removeItem(index) {
    cart.splice(index, 1);
    saveCart();
    renderCart();
    updateCartButton();
}

// ===============================
// CHECKOUT → SEND ORDER
// ===============================
async function checkout() {
    const tableNo = localStorage.getItem("tableNo");

    if (!tableNo) {
        alert("Table number missing. Scan QR again.");
        return;
    }

    if (cart.length === 0) {
        alert("Your cart is empty!");
        return;
    }

    const payload = {
        tableNo: Number(tableNo),
        items: cart.map((i) => ({
            name: i.name,
            price: i.price,
            qty: i.qty,
            size: i.size || null,
            spice: i.spice || null,
            juice: i.juice || null,
            addons: i.addons || [],
            subtotal: i.price * i.qty,
            menu_id: i.menu_id || null
        })),
        total: cart.reduce((sum, i) => sum + i.price * i.qty, 0)
    };

    try {
        const res = await fetch(
            "https://vigilant-exploration-production.up.railway.app/api/order/new",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            }
        );

        const data = await res.json();

        if (!data.success) {
            alert("Order failed: " + data.error);
            return;
        }

        // Success
        localStorage.setItem("orderId", data.orderId);
        cart = [];
        saveCart();

        window.location.href = "payment.html";
    } catch (err) {
        console.error("Checkout error:", err);
        alert("Server error. Please try again.");
    }
}

// Render if on cart page
if (document.getElementById("cartItems")) {
    renderCart();
}
