document.addEventListener("DOMContentLoaded", () => {
  const itemForm = document.getElementById("itemForm");
  const itemsList = document.getElementById("itemsList");

  // Add item to Firestore
  itemForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const itemName = document.getElementById("itemName").value;
    const description = document.getElementById("description").value;
    const type = document.getElementById("type").value;
    const location = document.getElementById("location").value;
    const date = document.getElementById("date").value;

    await db.collection("lost_found_items").add({
      name,
      email,
      itemName,
      description,
      type,
      location,
      date,
      claimed: false,
      foundBy: "",
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    itemForm.reset();
    alert("Item added successfully!");
    fetchItems();
  });

  // Fetch items from Firestore
  const fetchItems = async () => {
    itemsList.innerHTML = "";
    const snapshot = await db
      .collection("lost_found_items")
      .orderBy("timestamp", "desc")
      .get();

    snapshot.forEach((doc) => {
      const item = doc.data();
      const docId = doc.id;

      const col = document.createElement("div");
      col.className = "col";

      // Action buttons
      let actionButtons = "";

      if (item.type === "Found" && !item.claimed) {
        actionButtons += `<button class="btn btn-success btn-sm mb-2 w-100 claimBtn">Claim</button>`;
      } else if (item.type === "Lost" && !item.foundBy) {
        actionButtons += `<button class="btn btn-warning btn-sm mb-2 w-100 markFoundBtn">Mark as Found</button>`;
      }

      // Add Delete button
      actionButtons += `<button class="btn btn-danger btn-sm mb-2 w-100 deleteBtn">Delete Listing</button>`;

      const claimedBadge = item.claimed
        ? `<span class="badge bg-info ms-1">Claimed</span>`
        : "";

      const foundByBadge = item.foundBy
        ? `<span class="badge bg-warning ms-1">Found by ${item.foundBy}</span>`
        : "";

      col.innerHTML = `
      <div class="card p-3 h-100 shadow-sm rounded item-card">
        <h5>${item.itemName} - ${item.description}</h5>
        <p>
          <span class="badge bg-${item.type === "Lost" ? "danger" : "success"}">${item.type}</span>
          ${claimedBadge}${foundByBadge}
        </p>
        <p><strong>Name:</strong> ${item.name}</p>
        ${item.location ? `<p><strong>Location:</strong> ${item.location}</p>` : ""}
        ${item.date ? `<p><strong>Date:</strong> ${item.date}</p>` : ""}
        ${actionButtons}
      </div>
      `;

      itemsList.appendChild(col);

      // Claim button
      const claimBtn = col.querySelector(".claimBtn");
      if (claimBtn) {
        claimBtn.addEventListener("click", async () => {
          await db.collection("lost_found_items").doc(docId).update({
            claimed: true,
            claimedBy: item.email || item.name
          });
          fetchItems();
        });
      }

      // Mark as Found button
      const markFoundBtn = col.querySelector(".markFoundBtn");
      if (markFoundBtn) {
        markFoundBtn.addEventListener("click", async () => {
          const finderEmail = prompt("Enter your email or name:");
          if (!finderEmail) return;

          await db.collection("lost_found_items").doc(docId).update({
            type: "Found",
            foundBy: finderEmail,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
          });
          fetchItems();
        });
      }

      // Delete button
      const deleteBtn = col.querySelector(".deleteBtn");
      if (deleteBtn) {
        deleteBtn.addEventListener("click", async () => {
          const confirmEmail = prompt("Enter your email to confirm deletion:");
          if (!confirmEmail) return;

          if (confirmEmail === item.email) {
            await db.collection("lost_found_items").doc(docId).delete();
            alert("Listing deleted successfully!");
            fetchItems();
          } else {
            alert("Email does not match! You cannot delete this listing.");
          }
        });
      }
    });
  };

  // Initial fetch
  fetchItems();

  // Refresh every 30 seconds
  setInterval(fetchItems, 30000);
});
