/**********************************************
 * SALES DASHBOARD — AUTH + FETCH HELPERS
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


/**********************************************
 * GENERIC FETCH WRAPPER WITH ERROR HANDLING
 **********************************************/
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

    try {
        return await res.json();
    } catch (e) {
        console.error("❌ JSON parse error:", e);
        requireLoginAgain();
        return null;
    }
}


/**********************************************
 * LOAD DASHBOARD DATA
 **********************************************/
async function loadDashboard() {
    try {
        const daily = await fetchJSON("/api/analytics/daily");
        const monthly = await fetchJSON("/api/analytics/monthly");
        const top = await fetchJSON("/api/analytics/top-items");

        if (!daily || !monthly || !top) {
            console.warn("⚠️ Missing data from server");
            return;
        }

        // DAILY REVENUE
        document.getElementById("daily-total").textContent =
            daily.total || 0;

        // MONTHLY REVENUE
        document.getElementById("monthly-total").textContent =
            monthly.total || 0;

        // TOP ITEMS
        const topList = document.getElementById("top-items");
        topList.innerHTML = top.map(item => `
            <li>
                <b>${item.name}</b>
                — ${item.count} sold (¥${item.revenue})
            </li>
        `).join("");

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
