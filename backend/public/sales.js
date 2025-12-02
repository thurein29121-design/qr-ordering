// public/sales.js

async function fetchJSON(url) {
  const token = localStorage.getItem('adminToken') || '';
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(`Failed: ${url} (${res.status})`);
  return res.json();
}


function formatYen(v) {
  return "¥" + Number(v || 0).toLocaleString();
}

async function loadDashboard() {
  try {
    // 1) Today's sales
    const today = await fetchJSON("/api/analytics/sales/today");
    document.getElementById("today-sales").textContent = formatYen(today.total_sales || 0);
    document.getElementById("today-sessions").textContent =
      `${today.sessions || 0} sessions, ${today.total_items || 0} items`;

    // 2) Weekday vs weekend
    const ww = await fetchJSON("/api/analytics/sales/weekday-weekend");
    const weekday = ww.weekday || {};
    const weekend = ww.weekend || {};

    document.getElementById("weekday-avg").textContent = formatYen(weekday.avg_receipt || 0);
    document.getElementById("weekday-total").textContent = "Total: " + formatYen(weekday.total_sales || 0);

    document.getElementById("weekend-avg").textContent = formatYen(weekend.avg_receipt || 0);
    document.getElementById("weekend-total").textContent = "Total: " + formatYen(weekend.total_sales || 0);

    let boost = 0;
    if (weekday.avg_receipt > 0 && weekend.avg_receipt > 0) {
      boost = ((weekend.avg_receipt - weekday.avg_receipt) / weekday.avg_receipt) * 100;
    }
    document.getElementById("weekend-boost").textContent = boost.toFixed(1) + "%";

    // 3) Top items today
    const topItems = await fetchJSON("/api/analytics/items/top-today");
    const tbody = document.getElementById("top-items-body");

    if (!Array.isArray(topItems) || topItems.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3">No data for today.</td></tr>`;
    } else {
      tbody.innerHTML = topItems.map(i => `
        <tr>
          <td>${i.name}</td>
          <td>${i.total_qty}</td>
          <td>${formatYen(i.revenue)}</td>
        </tr>
      `).join("");
    }

  } catch (err) {
    console.error("❌ dashboard error:", err);
    alert("Failed to load sales dashboard data.");
  }
}

document.addEventListener("DOMContentLoaded", loadDashboard);
