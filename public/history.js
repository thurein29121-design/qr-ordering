document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const tableNo = params.get("table");

  document.getElementById("backMenu").onclick = () => {
    window.location.href = `main.html?table=${tableNo}`;
  };

  const container = document.getElementById("history-container");
  const loading = document.getElementById("loading");

  try {
    // SAME SOURCE AS STAFF CHECK (READ-ONLY)
    const res = await fetch(`/api/order/table-items/${tableNo}`);
    const data = await res.json();

    if (!data.success || !data.items || data.items.length === 0) {
      loading.textContent = "No order found.";
      return;
    }

    loading.style.display = "none";

    const card = document.createElement("div");
    card.className = "history-card";

    card.innerHTML = `
      <div class="history-header">
        <h3>Table ${tableNo}</h3>
        <span>Current Order</span>
      </div>

      <div class="order-items"></div>

      <h3 style="text-align:right;margin-top:10px;">
        Total: ¥${Number(data.total_price).toFixed(2)}
      </h3>
    `;

    const itemsContainer = card.querySelector(".order-items");

    data.items.forEach(item => {
      const meta = [];

      if (item.size) meta.push(`Size: ${item.size}`);
      if (item.spice) meta.push(`Spice: ${item.spice}`);
      if (item.juice) meta.push(`Juice: ${item.juice}`);
      if (item.addons && item.addons.length) {
        meta.push("Add-ons: " + item.addons.map(a => a.name).join(", "));
      }

      const row = document.createElement("div");
      row.className = "item";

      row.innerHTML = `
        <div>
          <strong>${item.qty} × ${item.name}</strong><br>
          <div class="item-details">${meta.join("<br>")}</div>
        </div>
        <div>¥${Number(item.subtotal).toFixed(2)}</div>
      `;

      itemsContainer.appendChild(row);
    });

    container.appendChild(card);

  } catch (err) {
    container.innerHTML = "<p style='color:red;'>Failed to load order.</p>";
    console.error(err);
  }
});
