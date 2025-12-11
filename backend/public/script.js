// ===================== Verify table status first =====================
(async () => {
  const tableNo = localStorage.getItem("tasteqr_table");
  if (!tableNo) {
    window.location.href = "index.html";
    return;
  }

  try {
    // ✅ same-origin URL (no https hardcode)
    const res = await fetch(`/api/tables/${tableNo}/status`);
    const data = await res.json();

    // active = true → GREEN (open, customers can use)
    // active = false → RED (closed)
    if (!data.active) {
      alert("⚠️ Your table is closed. Please call staff and enter your table number again.");
      localStorage.removeItem("tasteqr_table");
      window.location.href = "index.html";
    }
  } catch (e) {
    console.error("Failed to verify table status:", e);
  }
})();


// ===================== Global cart badge updater =====================
function updateCartCount() {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const totalQty = cart.reduce((sum, i) => sum + Number(i.qty || 0), 0);
  const badge = document.getElementById("cartCount");
  if (badge) badge.textContent = totalQty;
}


// ===================== TasteQR Menu Script (no sidebar) =====================
document.addEventListener("DOMContentLoaded", () => {
  const navItems = document.querySelectorAll(".nav-item");
  const mainContainer = document.getElementById("main-container");
  const cartBtn = document.getElementById("openCartBtn");
  const callBtn = document.getElementById("callStaffButton");
  const viewHeaderBtn = document.getElementById("viewHistoryButton");

  // ✅ Read table number from URL or localStorage
  const urlParams = new URLSearchParams(window.location.search);
  const tableNo = localStorage.getItem("tasteqr_table") || "999";
  console.log("📋 Current Table:", tableNo);

  // 🛒 Cart in localStorage
  let cart = JSON.parse(localStorage.getItem("cart")) || [];

  function saveCart() {
    localStorage.setItem("cart", JSON.stringify(cart));
    updateCartCount();
  }

  // 🔹 Load menu items from backend
  async function loadMenu(category) {
    if (!category) {
      mainContainer.innerHTML = "<p>No category selected.</p>";
      return;
    }

    mainContainer.innerHTML = "Loading...";
    try {
      console.log("📥 Fetching menu for category:", category);
      const res = await fetch(`/api/menu/${encodeURIComponent(category)}`);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const items = await res.json();

      if (!Array.isArray(items) || items.length === 0) {
        mainContainer.innerHTML = "<p>No items found.</p>";
        return;
      }

      mainContainer.innerHTML = "";
      items.forEach((data) => {
        console.log("MENU RAW DATA:", data);

        try {
          if (data.size_price) data.size_price = JSON.parse(data.size_price);
          if (data.spicy_levels) data.spicy_levels = JSON.parse(data.spicy_levels);
          if (data.addons) data.addons = JSON.parse(data.addons);
          if (data.juice_options) data.juice_options = JSON.parse(data.juice_options);
        } catch (e) {
          console.error("JSON Parse Error:", e);
        }

        const div = document.createElement("div");
        const extraClass =
          (data.category?.toLowerCase() === "set") ? "set-item" : "";
        div.className = `menu-item ${extraClass}`;
        div.innerHTML = `
          <div class="menu-info">
            <div class="menu-name">${escapeHtml(data.name)}</div>
            <div class="menu-price">¥${data.price}</div>
          </div>
          <div class="menu-pic">
            <img src="${escapeHtml(data.image)}" alt="${escapeHtml(data.name)}" />
          </div>
        `;

        // 🛒 open customize popup when clicked
        div.addEventListener("click", () => openCustomizePopup(data));
        mainContainer.appendChild(div);
      });
    } catch (err) {
      console.error("❌ Menu load error:", err);
      mainContainer.innerHTML = "<p>Error loading menu.</p>";
    }
  }

  // ==========================
  // 🔔 CALL STAFF — 3s Sound + Notification
  // ==========================
  if (callBtn) {
    const bellSound = new Audio("/sound/alarm.mp3");

    // Create notification box
    const notice = document.createElement("div");
    notice.id = "staffNotice";
    notice.style.cssText = `
      position: fixed;
      left: 50%;
      bottom: 60px;
      transform: translateX(-50%);
      background: #4CAF50;
      color: white;
      font-weight: 600;
      padding: 12px 18px;
      border-radius: 10px;
      opacity: 0;
      transition: opacity 0.4s ease, bottom 0.4s ease;
      z-index: 9999;
    `;
    document.body.appendChild(notice);

    callBtn.addEventListener("click", () => {
      try {
        bellSound.pause();
        bellSound.currentTime = 0;

        bellSound.play().catch(() => {});

        callBtn.classList.add("calling");
        callBtn.disabled = true;
        callBtn.textContent = "🚶‍♂️ Staff Coming...";

        setTimeout(() => {
          bellSound.pause();
          bellSound.currentTime = 0;
        }, 3000);

        setTimeout(() => {
          showStaffNotice("✅ Staff has been notified!");
        }, 3000);

        setTimeout(() => {
          callBtn.classList.remove("calling");
          callBtn.disabled = false;
          callBtn.textContent = "🔔 Call Staff";
        }, 3000);
      } catch (err) {
        console.error("❌ Call staff error:", err);
      }
    });

    function showStaffNotice(msg) {
      notice.textContent = msg;
      notice.style.bottom = "80px";
      notice.style.opacity = "1";
      setTimeout(() => {
        notice.style.opacity = "0";
        notice.style.bottom = "60px";
      }, 2000);
    }
  }

  // ✅ Header "View History" button
  if (viewHeaderBtn) {
    viewHeaderBtn.addEventListener("click", async () => {
      const tableNo = localStorage.getItem("tasteqr_table");

      if (!tableNo) {
        alert("⚠️ Please enter your table number first.");
        window.location.href = "index.html";
        return;
      }

      try {
        const res = await fetch(`/api/tables/${tableNo}/status`);
        const data = await res.json();

        if (data.active) {
          window.location.href = `history.html?table=${encodeURIComponent(tableNo)}`;
        } else {
          alert("⚠️ This table has been closed. Please enter your table number again.");
          localStorage.removeItem("tasteqr_table");
          window.location.href = "index.html";
        }
      } catch (err) {
        console.error("❌ Failed to check table status:", err);
        alert("Server connection error.");
      }
    });
  }

  // 🛒 Cart button → go to cart.html
  if (cartBtn) {
    cartBtn.addEventListener("click", () => {
      const base = "cart.html";
      if (tableNo) {
        window.location.href = `${base}?table=${encodeURIComponent(tableNo)}`;
      } else {
        window.location.href = base;
      }
    });
  }

  // 🧱 Safe HTML
  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  // 🔀 Navigation bar
  navItems.forEach((item, idx) => {
    item.addEventListener("click", () => {
      navItems.forEach((n) => n.classList.remove("active"));
      item.classList.add("active");
      const menuNum = item.getAttribute("data-menu");
      loadMenu(menuNum);
    });

    if (idx === 0) {
      item.classList.add("active");
    }
  });

  // 🚀 Load first category automatically
  const firstCategory = navItems[0]?.getAttribute("data-menu") || "Set";
  loadMenu(firstCategory);

  // Initialize cart count on load
  updateCartCount();
});


/// =====================
// POPUP STATE
// =====================
let selectedItem = null;
let selectedSize = null;   // { size, extra }
let selectedSpice = null;
let selectedJuice = null;  // object from juice_options
let selectedAddons = [];

// =====================
// OPEN POPUP
// =====================
function openCustomizePopup(item) {
  document.getElementById("popup-image").src = item.image;

  selectedItem = item;
  selectedSize = null;
  selectedSpice = null;
  selectedJuice = null;
  selectedAddons = [];

  const nameEl = document.getElementById("item-name");
  const sizeDiv = document.getElementById("size-section");
  const spiceDiv = document.getElementById("spice-section");
  const addonsDiv = document.getElementById("addons-section");
  const juiceDiv = document.getElementById("juice-section");

  nameEl.textContent = item.name;

  // clear old
  sizeDiv.innerHTML = "";
  spiceDiv.innerHTML = "";
  addonsDiv.innerHTML = "";
  juiceDiv.innerHTML = "";

  /* =====================
       SIZE SECTION
  ===================== */
  if (item.size_price && Object.keys(item.size_price).length > 0) {
    sizeDiv.style.display = "block";
    sizeDiv.innerHTML = "<h4>Choose Size</h4>";

    Object.entries(item.size_price).forEach(([size, extra]) => {
      const btn = document.createElement("div");
      btn.className = "option-btn size-btn";
      btn.dataset.size = size;
      btn.dataset.extra = extra;
      btn.textContent = `${size} (+¥${extra})`;
      sizeDiv.appendChild(btn);
    });
  } else {
    sizeDiv.style.display = "none";
    selectedSize = { size: null, extra: 0 };
  }

  /* =====================
       SPICE SECTION
  ===================== */
  if (item.spicy_levels && item.spicy_levels.length > 0) {
    spiceDiv.style.display = "block";
    spiceDiv.innerHTML = "<h4>Spice Level</h4>";

    item.spicy_levels.forEach(level => {
      const btn = document.createElement("div");
      btn.className = "option-btn spice-btn";
      btn.dataset.spice = level;
      btn.textContent = level;
      spiceDiv.appendChild(btn);
    });
  } else {
    spiceDiv.style.display = "none";
    selectedSpice = null;
  }

  /*=========================
      JUICE SECTION
  ===========================*/
  if (item.juice_options && Array.isArray(item.juice_options)) {
    juiceDiv.style.display = "block";
    juiceDiv.innerHTML = "<h4>Choose Juice</h4>";

    const grid = document.createElement("div");
    grid.className = "juice-grid";
    juiceDiv.appendChild(grid);

    item.juice_options.forEach(j => {
      const card = document.createElement("div");
      card.className = "juice-card";
      card.dataset.juice = JSON.stringify(j);

      card.innerHTML = `
        <img src="${j.image}" alt="${j.name}">
        <div class="addon-name">${j.name}</div>
        <div class="addon-price">+¥${j.price}</div>
      `;

      grid.appendChild(card);
    });
  } else {
    juiceDiv.style.display = "none";
    selectedJuice = null;
  }

  /* =====================
       ADDONS WITH IMAGE
  ===================== */
  if (item.addons && item.addons.length > 0) {
    addonsDiv.style.display = "block";
    addonsDiv.innerHTML = "<h4>Add-ons</h4>";

    const grid = document.createElement("div");
    grid.className = "addon-grid";
    addonsDiv.appendChild(grid);

    item.addons.forEach(a => {
      const card = document.createElement("div");
      card.className = "addon-card";
      card.dataset.addon = JSON.stringify(a);

      card.innerHTML = `
        ${a.image ? `<img src="${a.image}" alt="${a.name}">` : ""}
        <div class="addon-info">
          <div class="addon-name">${a.name}</div>
          <div class="addon-price">+¥${a.price}</div>
        </div>
      `;

      grid.appendChild(card);
    });
  } else {
    addonsDiv.style.display = "none";
    selectedAddons = [];
  }

  /* =====================
       EVENT LISTENERS
  ===================== */

  // size
  sizeDiv.querySelectorAll(".size-btn").forEach(btn => {
    btn.onclick = () => {
      selectedSize = {
        size: btn.dataset.size,
        extra: Number(btn.dataset.extra || 0)
      };
      sizeDiv.querySelectorAll(".size-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    };
  });

  // spice
  spiceDiv.querySelectorAll(".spice-btn").forEach(btn => {
    btn.onclick = () => {
      selectedSpice = btn.dataset.spice;
      spiceDiv.querySelectorAll(".spice-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    };
  });

  // addons
  addonsDiv.querySelectorAll(".addon-card").forEach(card => {
    card.onclick = () => {
      const addon = JSON.parse(card.dataset.addon);
      const exists = selectedAddons.some(a => a.name === addon.name);

      if (exists) {
        selectedAddons = selectedAddons.filter(a => a.name !== addon.name);
        card.classList.remove("active");
      } else {
        selectedAddons.push({
          name: addon.name,
          price: Number(addon.price || 0),
          image: addon.image || null
        });
        card.classList.add("active");
      }
    };
  });

  // JUICE SELECTION (single)
  juiceDiv.querySelectorAll(".juice-card").forEach(card => {
    card.onclick = () => {
      const j = JSON.parse(card.dataset.juice);
      selectedJuice = j;

      juiceDiv.querySelectorAll(".juice-card")
        .forEach(c => c.classList.remove("active"));

      card.classList.add("active");
    };
  });

  // show popup
  document.getElementById("popup-back").onclick = resetCustomizePopup;

  document.getElementById("customize-popup").style.display = "flex";
}


// =====================
// CLOSE POPUP
// =====================
function resetCustomizePopup() {
  document.getElementById("customize-popup").style.display = "none";
}


// =====================
// ADD TO CART (base price only, extras separate, merge same options)
// =====================
document.getElementById("confirm-add").onclick = () => {
  if (!selectedItem) return;

  const basePrice = Number(selectedItem.price) || 0;
  const sizeLabel = selectedSize?.size || null;
  const sizeExtra = Number(selectedSize?.extra || 0);
  const spice = selectedSpice || "Normal";

  const juiceName = selectedJuice ? selectedJuice.name : null;
  const juicePrice = selectedJuice ? Number(selectedJuice.price || 0) : 0;

  const addonsClean = (selectedAddons || []).map(a => ({
    name: a.name,
    price: Number(a.price || 0)
  }));

  const newItem = {
    name: selectedItem.name,
    price: basePrice,         // base price only
    size: sizeLabel,
    sizeExtra,
    spice,
    juice: juiceName ? { name: juiceName, price: juicePrice } : null,
    juicePrice,
    addons: addonsClean,
    qty: 1,
    image: selectedItem.image
  };

  const cart = JSON.parse(localStorage.getItem("cart")) || [];

  // merge with existing item if all options match
  const matchIndex = cart.findIndex(i => {
    if (i.name !== newItem.name) return false;
    if ((i.size || null) !== (newItem.size || null)) return false;
    if ((i.spice || "Normal") !== (newItem.spice || "Normal")) return false;

    const oldJuice = i.juice?.name || null;
    const newJuice = newItem.juice?.name || null;
    if (oldJuice !== newJuice) return false;

    const oldAddons = (i.addons || []).map(a => a.name).sort();
    const newAddons = (newItem.addons || []).map(a => a.name).sort();
    if (oldAddons.length !== newAddons.length) return false;
    for (let idx = 0; idx < oldAddons.length; idx++) {
      if (oldAddons[idx] !== newAddons[idx]) return false;
    }
    return true;
  });

  if (matchIndex >= 0) {
    cart[matchIndex].qty += 1;
  } else {
    cart.push(newItem);
  }

  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartCount();
  resetCustomizePopup();
};

// cancel button
document.getElementById("close-popup").onclick = resetCustomizePopup;
