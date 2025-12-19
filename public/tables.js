let tables = [];
const grid = document.getElementById("table-grid");
const popup = document.getElementById("popup-overlay");
const popupTitle = document.getElementById("popup-title");
const checkoutBtn = document.getElementById("checkoutBtn");
const openBtn = document.querySelector(".status-occupied");

const checkBtn = document.getElementById("checkBtn");

const checkOverlay = document.getElementById("check-overlay");
const checkTitle = document.getElementById("check-title");
const checkItems = document.getElementById("check-items");
const checkTotalItems = document.getElementById("check-total-items");
const checkTotalPrice = document.getElementById("check-total-price");
const checkCloseBtn = document.getElementById("check-close");

if (checkCloseBtn && checkOverlay) {
  checkCloseBtn.onclick = () => checkOverlay.classList.add("hidden");
}

const receiptPopup = document.getElementById("receiptPopup");
const receiptText = document.getElementById("receiptText");


let currentTable = null;
checkBtn.onclick = async () => {
  if (!currentTable) return;
  await loadCheckData(currentTable);
  checkOverlay.classList.remove("hidden"); // ✅ REQUIRED
};

// Load tables
async function loadTables() {
  try {
    const res = await fetch("/api/tables");
    tables = await res.json();
    tables.sort((a, b) => Number(a.table_no) - Number(b.table_no));
    renderTiles();
  } catch (e) {
    console.error("Failed to load tables:", e);
  }
}

function renderTiles() {
  grid.innerHTML = "";

  tables.forEach(t => {
    const div = document.createElement("div");
    div.className = "table-tile";

    if (t.is_active === 1) div.classList.add("available"); // GREEN
    if (t.is_active === 0) div.classList.add("occupied");  // RED

    div.innerHTML = `
      <div class="table-number">Table ${t.table_no}</div>
      <div class="table-status">
        ${t.is_active === 1 ? "🔴 Sitting " : "🟢 Blank"}
      </div>
    `;

    div.onclick = () => openPopup(t.table_no);
    grid.appendChild(div);
  });
}

function openPopup(tableNo) {
  currentTable = tableNo;
  popupTitle.textContent = `TABLE ${tableNo}`;

  const tile = [...document.querySelectorAll(".table-tile")]
    .find(t => t.textContent.includes(`Table ${tableNo}`));

  if (!tile) return;

  const rect = tile.getBoundingClientRect();

  popup.classList.remove("hidden");

  const popupBox = document.getElementById("popup");

  popupBox.style.left = rect.left + rect.width / 2 - popupBox.offsetWidth / 2 + "px";
  popupBox.style.top = rect.top - popupBox.offsetHeight - 10 + "px";

  // if popup goes above screen → move below tile
  if (rect.top - popupBox.offsetHeight < 0) {
    popupBox.style.top = rect.bottom + 10 + "px";
  }
}


document.getElementById("cancel-btn").onclick = () => {
  popup.classList.add("hidden");
};

// 🟢 OPEN (GREEN)
openBtn.onclick = async () => {
  if (!currentTable) return;

  await fetch(`/api/tables/${currentTable}/state`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state: 1 })
  });

  popup.classList.add("hidden");
  loadTables();
};

// 🔴 CLOSE & SHOW RECEIPT
checkoutBtn.onclick = async () => {
  if (!currentTable) return;

  const tableNo = currentTable;

  // 1. Generate receipt (get all items under same session)
  const res = await fetch(`/api/order/checkout/${tableNo}`, { method: "POST" });
  const data = await res.json();

  // 2. Close table + increment session
    await fetch(`/api/tables/close/${tableNo}`, {
  method: "POST"
});

location.reload();
/*await fetch(`/api/tables/${tableNo}/state`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state: 0 })
  });*/


  popup.classList.add("hidden");
  loadTables();

  // 3. ALWAYS show receipt popup
  if (data.success) {
    receiptText.textContent = formatReceipt(data);
    receiptPopup.classList.remove("hidden");
  } else {
    receiptText.textContent = `No orders found for Table ${tableNo}.`;
    receiptPopup.classList.remove("hidden");
  }
};

// Format receipt contents
function formatReceipt(data) {
  let out = "";

  out += `Rainbow Restaurant\n`;
  out += `-------------------------\n`;
  out += `Table: ${data.table_no}\n`;
  out += `Session: ${data.session_id}\n`;
  out += `Date: ${new Date().toLocaleString()}\n`;
  out += `-------------------------\n`;

  // ✅ calculate total correctly
  const total = data.items.reduce((sum, i) => {
    return sum + Number(i.subtotal || 0);
  }, 0);

  let totalItems = 0;

  data.items.forEach(i => {
    out += `${i.qty} x ${i.name}\n`;

    totalItems += Number(i.qty);

    if (i.size) out += `   Size: ${i.size}\n`;
    if (i.spice) out += `   Spice: ${i.spice}\n`;
    if (i.juice) out += `   Juice: ${i.juice}\n`;

    if (i.addons && i.addons.length > 0) {
      out += `   Add-ons: ${i.addons.map(a => a.name).join(", ")}\n`;
    }

    out += `   ¥${Number(i.subtotal)}\n\n`;
  });

  out += `-------------------------\n`;
  out += `TOTAL ITEMS: ${totalItems}\n`;
  out += `TOTAL: ¥${total}\n`;
  out += `-------------------------\n`;
  out += `Thank you!\n`;

  return out;
}
async function loadCheckData(tableNo) {
  try {
    const res = await fetch(`/api/order/table-items/${tableNo}`);
    const data = await res.json();

    checkTitle.textContent = `TABLE ${tableNo} — Orders`;
    renderCheckPopup(data, tableNo);
  } catch (err) {
    console.error("❌ Check load error:", err);
    alert("Failed to load items for this table");
  }
}

function renderCheckPopup(data, tableNo) {
  checkItems.innerHTML = "";

  if (!data.success || !data.items || data.items.length === 0) {
    checkItems.innerHTML = `<p>No items for this table.</p>`;
    checkTotalItems.textContent = "0";
    checkTotalPrice.textContent = "0";
  } else {
    data.items.forEach(item => {
      const row = document.createElement("div");
      row.className = "check-row";
      row.dataset.itemId = item.id;

      const metaParts = [];
      if (item.size) metaParts.push(`Size: ${item.size}`);
      if (item.spice) metaParts.push(`Spice: ${item.spice}`);
      if (item.juice) metaParts.push(`Juice: ${item.juice}`);
      if (item.addons && item.addons.length) {
        metaParts.push("Add-ons: " + item.addons.map(a => a.name).join(", "));
      }
      const metaText = metaParts.join("\n");

      row.innerHTML = `
        <div class="check-main">
          <div class="check-name">${item.name}</div>
          ${metaText ? `<div class="check-meta">${metaText}</div>` : ""}
        </div>
        <div class="check-controls">
          <div class="check-qty">
            <button data-action="dec">-</button>
            <span class="check-qty-value">${item.qty}</span>
            <button data-action="inc">+</button>
          </div>
          <div class="check-subtotal">¥${Number(item.subtotal).toFixed(2)}</div>
          <button class="check-delete" data-action="delete">✕</button>
        </div>
      `;

      // attach events
      const decBtn = row.querySelector('[data-action="dec"]');
      const incBtn = row.querySelector('[data-action="inc"]');
      const delBtn = row.querySelector('[data-action="delete"]');

      decBtn.onclick = () => {
        const current = Number(
          row.querySelector(".check-qty-value").textContent
        );
        const next = current - 1;
        if (next < 1) return;
        updateItemQty(item.id, next, tableNo);
      };

      incBtn.onclick = () => {
        const current = Number(
          row.querySelector(".check-qty-value").textContent
        );
        const next = current + 1;
        updateItemQty(item.id, next, tableNo);
      };

      delBtn.onclick = () => {
        if (confirm("Delete this item?")) {
          deleteItem(item.id, tableNo);
        }
      };

      checkItems.appendChild(row);
    });

    checkTotalItems.textContent = String(data.total_items);
    checkTotalPrice.textContent = Number(data.total_price).toFixed(2);
  }

  checkOverlay.dataset.tableNo = tableNo;
  checkOverlay.classList.remove("hidden");
}

async function updateItemQty(itemId, qty, tableNo) {
  try {
    const res = await fetch(`/api/order/item/${itemId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qty })
    });
    const data = await res.json();
    if (!data.success) {
      alert(data.error || "Failed to update item");
      return;
    }
    await loadCheckData(tableNo);
  } catch (err) {
    console.error("❌ Update qty error:", err);
    alert("Update error");
  }
}

async function deleteItem(itemId, tableNo) {
  try {
    const res = await fetch(`/api/order/item/${itemId}`, { method: "DELETE" });
    const data = await res.json();
    if (!data.success) {
      alert(data.error || "Failed to delete item");
      return;
    }
    await loadCheckData(tableNo);
  } catch (err) {
    console.error("❌ Delete item error:", err);
    alert("Delete error");
  }
}


// Manual refresh
document.getElementById("refreshBtn").onclick = loadTables;

// Initial load
document.addEventListener("DOMContentLoaded", loadTables);
