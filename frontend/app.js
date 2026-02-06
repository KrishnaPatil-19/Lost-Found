// frontend/app.js
const API_BASE = "http://127.0.0.1:8000";

document.addEventListener("DOMContentLoaded", () => {
  const itemForm = document.getElementById("itemForm");
  const itemsList = document.getElementById("itemsList");
  const searchInput = document.getElementById("searchInput");

  // --- 1. SEARCH FUNCTIONALITY (New UI Feature) ---
  if (searchInput) {
    searchInput.addEventListener("keyup", (e) => {
      const term = e.target.value.toLowerCase();
      const items = document.querySelectorAll(".item-col");
      
      items.forEach((col) => {
        // Search inside the card's text content
        const text = col.textContent.toLowerCase();
        col.style.display = text.includes(term) ? "block" : "none";
      });
    });
  }

  // --- 2. FORM SUBMISSION (Logic Unchanged) ---
  function buildPayload(values) {
    return {
      name: values.name,
      email: values.email || null,
      item_name: values.itemName,
      description: values.description,
      type: values.type,
      location: values.location || null,
      date: values.date || null,
    };
  }

  itemForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!itemForm.checkValidity()) {
      itemForm.reportValidity();
      return;
    }

    // Get values
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const itemName = document.getElementById("itemName").value.trim();
    const description = document.getElementById("description").value.trim();
    const type = document.getElementById("type").value;
    const location = document.getElementById("location").value.trim();
    const date = document.getElementById("date").value;

    const payload = buildPayload({
      name, email, itemName, description, type, location, date,
    });

    try {
      const res = await fetch(`${API_BASE}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to add item");
      }

      if (email) localStorage.setItem("userEmail", email);
      
      itemForm.reset();
      // Visual feedback
      alert("Item posted successfully!");
      fetchItems();
    } catch (err) {
      alert("Error: " + err.message);
      console.error(err);
    }
  });

  // --- 3. FETCH & RENDER ITEMS (Updated for New UI) ---
  async function fetchItems() {
    // Show loading state if empty (optional polish)
    if(itemsList.innerHTML === "") {
        itemsList.innerHTML = '<div class="text-center w-100 mt-4 text-muted">Loading...</div>';
    }

    try {
      const res = await fetch(`${API_BASE}/items`);
      if (!res.ok) throw new Error("Failed to fetch items");
      const items = await res.json();

      // Clear list before rendering
      itemsList.innerHTML = "";

      if (items.length === 0) {
        itemsList.innerHTML = `
            <div class="col-12 text-center mt-5">
                <h5 class="text-muted">No items reported yet.</h5>
            </div>`;
        return;
      }

      items.forEach((item) => {
        const docId = item.id;
        
        // UI Logic: Determine styles based on Lost/Found status
        const isLost = item.type === "Lost";
        const typeClass = isLost ? "type-lost" : "type-found";
        const badgeClass = isLost ? "badge-lost" : "badge-found";
        const badgeText = item.type.toUpperCase();

        // Create the Column Wrapper
        const col = document.createElement("div");
        col.className = "col item-col"; // 'item-col' used for search filtering

        // Badges for status
        const claimedBadge = item.claimed
          ? `<span class="badge bg-secondary ms-2 rounded-pill">Claimed</span>`
          : "";
        const foundByBadge = item.found_by
          ? `<span class="badge bg-warning text-dark ms-2 rounded-pill">Found by ${escapeHtml(item.found_by)}</span>`
          : "";

        // Determine which action buttons to show
        let actionButtonsHtml = "";
        // Only show functional buttons if item is active
        if (item.type === "Found" && !item.claimed) {
            actionButtonsHtml += `<button class="btn btn-outline-success btn-sm flex-fill action-btn claimBtn">✅ Claim Item</button>`;
        } else if (item.type === "Lost" && !item.found_by) {
            actionButtonsHtml += `<button class="btn btn-outline-primary btn-sm flex-fill action-btn markFoundBtn">🙌 Mark Found</button>`;
        }
        // Delete is always available
        actionButtonsHtml += `<button class="btn btn-outline-danger btn-sm flex-fill action-btn deleteBtn">🗑️ Delete</button>`;

        // Construct the Card HTML
        col.innerHTML = `
          <div class="card item-card h-100 ${typeClass}">
            <div class="card-body d-flex flex-column">
              <!-- Header -->
              <div class="d-flex justify-content-between align-items-start mb-3">
                <div>
                    <span class="${badgeClass}">${badgeText}</span>
                    ${claimedBadge}
                    ${foundByBadge}
                </div>
                <small class="text-muted" style="font-size: 0.8rem;">
                    ${item.date ? escapeHtml(item.date) : "No Date"}
                </small>
              </div>
              
              <!-- Content -->
              <h5 class="card-title fw-bold text-dark mb-2">${escapeHtml(item.item_name)}</h5>
              <p class="card-text text-secondary small flex-grow-1">
                ${escapeHtml(item.description)}
              </p>
              
              <!-- Meta Data -->
              <div class="bg-light p-2 rounded mb-3 mt-2 small">
                <div class="d-flex align-items-center mb-1">
                    <span class="me-2">📍</span> 
                    <strong>${item.location ? escapeHtml(item.location) : "Unknown Location"}</strong>
                </div>
                <div class="d-flex align-items-center">
                    <span class="me-2">👤</span> 
                    <span>${escapeHtml(item.name)}</span>
                </div>
              </div>

              <!-- Actions -->
              <div class="d-flex gap-2 mt-auto">
                ${actionButtonsHtml}
              </div>
            </div>
          </div>
        `;

        itemsList.appendChild(col);

        // --- ATTACH EVENT LISTENERS (Logic Unchanged) ---

        // 1. Claim Button
        const claimBtn = col.querySelector(".claimBtn");
        if (claimBtn) {
          claimBtn.addEventListener("click", async () => {
            try {
              const updateRes = await fetch(`${API_BASE}/items/${docId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  claimed: true,
                  claimed_by: item.email || item.name,
                }),
              });
              if (!updateRes.ok) throw new Error("Failed to claim");
              fetchItems();
            } catch (err) {
              alert(err.message);
            }
          });
        }

        // 2. Mark Found Button
        const markFoundBtn = col.querySelector(".markFoundBtn");
        if (markFoundBtn) {
          markFoundBtn.addEventListener("click", async () => {
            const finder = prompt("Enter your email or name (finder):");
            if (!finder) return;
            try {
              const updateRes = await fetch(`${API_BASE}/items/${docId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "Found", found_by: finder }),
              });
              if (!updateRes.ok) throw new Error("Failed to mark as found");
              fetchItems();
            } catch (err) {
              alert(err.message);
            }
          });
        }

        // 3. Delete Button
        const deleteBtn = col.querySelector(".deleteBtn");
        if (deleteBtn) {
          deleteBtn.addEventListener("click", async () => {
            const confirmEmail = prompt("Enter your email to confirm deletion:");
            if (!confirmEmail) return;
            
            if (!confirm("Are you sure you want to delete this listing?")) return;

            try {
              const delRes = await fetch(
                `${API_BASE}/items/${docId}?email=${encodeURIComponent(confirmEmail)}`,
                { method: "DELETE" }
              );
              
              if (!delRes.ok) {
                const err = await delRes.json();
                throw new Error(err.detail || "Delete failed");
              }
              alert("Listing deleted successfully!");
              fetchItems();
            } catch (err) {
              alert("Error: " + err.message);
            }
          });
        }
      });
    } catch (err) {
      console.error(err);
      itemsList.innerHTML = `
        <div class="col-12">
            <div class="alert alert-danger shadow-sm">
                Could not fetch items: ${escapeHtml(err.message)}
            </div>
        </div>`;
    }
  }

  // Helper: Prevent XSS
  function escapeHtml(text) {
    if (text === null || text === undefined) return "";
    return String(text)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // Initial Fetch & Polling
  fetchItems();
  setInterval(fetchItems, 30000); // Poll every 30 seconds
});

//preventing user from selecting future dates in calendar
const dateInput = document.getElementById("date");

const today = new Date().toISOString().split("T")[0];
dateInput.max = today;
