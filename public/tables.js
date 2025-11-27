let tables = [];
const grid = document.getElementById("table-grid");
const popup = document.getElementById("popup-overlay");
const popupTitle = document.getElementById("popup-title");
const checkoutBtn = document.getElementById("checkoutBtn");
const openBtn = document.querySelector(".status-occupied");

const receiptPopup = document.getElementById("receipt-overlay");
const receiptText = document.getElementById("receipt-text");
const closeReceiptBtn = document.getElementById("close-receipt");

closeReceiptBtn.onclick = () => receiptPopup.classList.add("hidden");

let currentTable = null;

// Load tables
async function loadTables() {
  try {
    const res = await fetch("/api/tables");
    tables = await res.json();
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
  await fetch(`/api/tables/${tableNo}/state`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state: 0 })
  });

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


// Manual refresh
document.getElementById("refreshBtn").onclick = loadTables;

// Initial load
document.addEventListener("DOMContentLoaded", loadTables);
