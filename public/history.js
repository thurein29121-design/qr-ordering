document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const tableNo = params.get("table");

  document.getElementById("backMenu").onclick = () => {
    window.location.href = `main.html?table=${tableNo}`;
  };

  const container = document.getElementById("history-container");
  const loading = document.getElementById("loading");

  try {
   // 1️⃣ Ask backend for table status (get session_id)
const statusRes = await fetch(`/api/tables/${tableNo}/status`);
const status = await statusRes.json();

// 2️⃣ History should show PREVIOUS session
const historySession = Number(status.session_id) - 1;

if (historySession < 1) {
  loading.textContent = "No order history found.";
  return;
}

// 3️⃣ Fetch history
const res = await fetch(
  `/api/order/history/${tableNo}?session=${historySession}`
);


const data = await res.json();

if (!data.success || !data.items || data.items.length === 0) {
  loading.textContent = "No order history found.";
  return;
}


    loading.style.display = "none";

   loading.style.display = "none";

const card = document.createElement("div");
card.className = "history-card";

card.innerHTML = `
  <div class="history-header">
    <h3>Table ${data.table_no}</h3>
    <span>Session ${data.session_id}</span>
  </div>

  <div class="order-items"></div>
`;

const itemsContainer = card.querySelector(".order-items");

data.items.forEach(it => {
  let addonsArr = [];
  try {
    addonsArr = Array.isArray(it.addons) ? it.addons : JSON.parse(it.addons || "[]");
  } catch {}

  const details = [
    it.size ? `(${it.size})` : "",
    it.spice ? `Spice: ${it.spice}` : "",
    it.juice ? `Juice: ${it.juice}` : "",
    addonsArr.length ? `Add-ons: ${addonsArr.map(a => a.name).join(", ")}` : ""
  ].filter(Boolean).join("<br>");

  const itemDiv = document.createElement("div");
  itemDiv.className = "item";
  itemDiv.innerHTML = `
    <div>
      <strong>${it.name}</strong><br>
      <div class="item-details">${details}</div>
    </div>
    <div>¥${it.subtotal}</div>
  `;

  itemsContainer.appendChild(itemDiv);
});

container.appendChild(card);

  } catch (err) {
    container.innerHTML = "<p style='color:red;'>Failed to load history.</p>";
    console.error(err);
  }
});
