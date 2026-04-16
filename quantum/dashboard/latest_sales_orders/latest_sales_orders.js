(function () {
  let loadingEl = document.querySelector(".sales-orders-data-loading");
  loadingEl.style.display = "block";

  const state = {
    currentPage: 1,
    totalPages: 1,
  };

  function fetchSalesOrders(pageId) {
    loadingEl.style.display = "block";
    state.currentPage = pageId;
    document.querySelector(
      ".sales-orders-current-page > b > span.current-page"
    ).innerHTML = pageId;

    $.ajax({
      type: "POST",
      url: "dashboard/latest_sales_orders/fetch_latest_sales_orders.php",
      data: { pageId },
      success: function (data) {
        try {
          data = JSON.parse(data);
        } catch (e) {
          console.error("Failed to parse sales orders response", e, data);
          loadingEl.style.display = "none";
          return;
        }

        const rows = data.data || [];
        const total = data.total_rows || 0;
        state.totalPages = Math.ceil(total / 10) || 1;

        document.querySelector(
          ".sales-orders-current-page .total-pages"
        ).innerHTML = state.totalPages;
        $(".sales_total_orders_count").html(total);

        drawRows(rows);
        loadingEl.style.display = "none";
      },
      error: function (xhr) {
        console.error("Sales orders fetch failed", xhr);
        loadingEl.style.display = "none";
      },
    });
  }

  function drawRows(rows) {
    const tbody = document.querySelector(".sales-orders-table > tbody");
    tbody.innerHTML = "";
    rows.forEach((r) => {
      const tr = document.createElement("tr");
      const {
        order_id,
        date,
        customer_id,
        customer_name,
        po_ref,
        qty,
      } = r;

      const displayDate = (date || "").toString().split(" ")[0];
      const custName = customer_name || customer_id || "";
      const link = `orders/imei/new_order.php?sales_order=${order_id}&cust=${customer_id}`;

      tr.innerHTML = `
        <td><a href="${link}">${order_id ?? ""}</a></td>
        <td>${displayDate}</td>
        <td>${custName}</td>
        <td>${po_ref ?? ""}</td>
        <td>${qty ?? ""}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Pagination controls
  const navBtns = document.getElementsByClassName("sales-orders-prev-next-btn");
  for (let i = 0; i < navBtns.length; i++) {
    navBtns[i].addEventListener("click", function (e) {
      e.preventDefault();
      if (this.dataset.value === "next") {
        if (state.currentPage < state.totalPages) state.currentPage++;
        else return;
      } else if (this.dataset.value === "previous") {
        if (state.currentPage > 1) state.currentPage--;
        else return;
      }
      fetchSalesOrders(state.currentPage);
    });
  }

  // initial load
  fetchSalesOrders(1);
})();
