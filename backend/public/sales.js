/**********************************************
 * SALES DASHBOARD — HELPERS
 **********************************************/

function getAuthHeaders() {
    return {
        "Authorization": "Bearer " + (localStorage.getItem("adminToken") || "")
    };
}

function requireLoginAgain() {
    alert("Your session expired. Please login again.");
    localStorage.removeItem("adminToken");
    window.location.href = "admin.html";
}

async function fetchJSON(url) {
    const res = await fetch(url, { headers: getAuthHeaders() });

    if (res.status === 401) {
        requireLoginAgain();
        return null;
    }

    if (!res.ok) {
        console.error("❌ Fetch failed:", res.status, url);
        return null;
    }

    return res.json();
}


/**********************************************
 * LOAD DASHBOARD DATA
 **********************************************/
async function loadDashboard() {
    try {
        // ---- TODAY'S SALES ----
        const today = await fetchJSON("/api/analytics/sales/today");

        if (today) {
            document.getElementById("today-sales").textContent =
                "¥" + Number(today.total_sales || 0).toLocaleString();

            document.getElementById("today-sessions").textContent =
                `${today.sessions || 0} sessions, ${today.total_items || 0} items`;
        }

        // ---- WEEKDAY vs WEEKEND ----
        const ww = await fetchJSON("/api/analytics/sales/weekday-weekend");

        if (ww) {
            const weekday = ww.weekday || {};
            const weekend = ww.weekend || {};

            document.getElementById("weekday-avg").textContent =
                "¥" + Number(weekday.avg_receipt || 0).toFixed(0);

            document.getElementById("weekday-total").textContent =
                "Total: ¥" + Number(weekday.total_sales || 0).toLocaleString();

            document.getElementById("weekend-avg").textContent =
                "¥" + Number(weekend.avg_receipt || 0).toFixed(0);

            document.getElementById("weekend-total").textContent =
                "Total: ¥" + Number(weekend.total_sales || 0).toLocaleString();

            let boost = 0;
            if (weekday.avg_receipt > 0 && weekend.avg_receipt > 0) {
                boost = ((weekend.avg_receipt - weekday.avg_receipt) / weekday.avg_receipt) * 100;
            }
            document.getElementById("weekend-boost").textContent = boost.toFixed(1) + "%";
        }

        // ---- TOP ITEMS TODAY ----
        const topItems = await fetchJSON("/api/analytics/items/top-today");
        const tbody = document.getElementById("top-items-body");

        if (!Array.isArray(topItems) || topItems.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3">No data for today.</td></tr>`;
        } else {
            tbody.innerHTML = topItems
                .map(i => `
                    <tr>
                        <td>${i.name}</td>
                        <td>${i.total_qty}</td>
                        <td>¥${Number(i.revenue).toFixed(0)}</td>
                    </tr>
                `)
                .join("");
        }

    } catch (err) {
        console.error("❌ dashboard error:", err);
        alert("Failed to load sales dashboard.");
    }
}


/**********************************************
 * INIT
 **********************************************/
document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
        alert("Please login as admin first.");
        window.location.href = "admin.html";
        return;
    }

    loadDashboard();
});
