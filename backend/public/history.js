document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const tableNo = params.get("table");

  document.getElementById("backMenu").onclick = () => {
    window.location.href = `main.html?table=${tableNo}`;
  };

  const container = document.getElementById("history-container");
  const loading = document.getElementById("loading");

  try {
   const session = localStorage.getItem("tasteqr_session");
  const res = await fetch(`/api/order/history/${tableNo}?session=${session}`);

    const orders = await res.json();

    if (!Array.isArray(orders) || orders.length === 0) {
      loading.textContent = "No order history found.";
      return;
    }

    loading.style.display = "none";

    orders.forEach(order => {
      const card = document.createElement("div");
      card.className = "history-card";

      card.innerHTML = `
        <div class="history-header">
          <h3>Order #${order.id}</h3>
          <span>${new Date(order.created_at).toLocaleString()}</span>
        </div>

        <div class="order-items"></div>

        <h3 style="text-align:right;margin-top:10px;">
          Total: ¥${Number(order.total).toFixed(2)}
        </h3>
      `;

      const itemsContainer = card.querySelector(".order-items");

      order.items.forEach(it => {
        // addons fix: handle array OR JSON string
        let addonsArr = [];
        if (Array.isArray(it.addons)) {
          addonsArr = it.addons;
        } else if (typeof it.addons === "string" && it.addons.trim() !== "") {
          try {
            addonsArr = JSON.parse(it.addons);
          } catch {}
        }

        const details = [
          it.size ? `(${it.size})` : "",
          it.spice ? `Spice: ${it.spice}` : "",
          it.juice ? `Juice: ${it.juice}` : "",
          addonsArr.length ? `Add-ons: ${addonsArr.map(a => a.name).join(", ")}` : ""
        ].filter(x => x).join("<br>");

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
    });
  } catch (err) {
    container.innerHTML = "<p style='color:red;'>Failed to load history.</p>";
    console.error(err);
  }
});
