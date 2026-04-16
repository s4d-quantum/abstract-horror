// show loading text by default
let dataLoading = document.querySelector(".data-loading");
let userSession = document.querySelector("#user_id").dataset;
let selectedOrderId = "";

// Get customers
let customersList = document.querySelectorAll(".customer-list > span"),
  customers = [];
for (let i = 0; i < customersList.length; i++) {
  let content = customersList[i].innerHTML;
  customers.push({
    id: content.slice(content.indexOf("%") + 1, content.length),
    name: content.slice(0, content.indexOf("%")),
  });
}

// get customers
function getCustomer(cstId) {
  return customers.find((customer) => cstId === customer.id)?.name || cstId;
}

(dataLoading.style.display = "block"),
  // Global Table state
  (tableState = {
    currentPage: 1,
    totalPages: undefined,
  });

// fetch datatable data
function fetchData(pageId, searchTerm) {
  dataLoading.style.display = "block";
  // if search input and not pagination input
  if (arguments[0] === null) {
    $.ajax({
      type: "POST",
      url: "includes/fetch_bm_orders.php",
      data: {
        searchTerm,
      },
      success: function (data) {
        data = JSON.parse(data);
        let rowsData = data.data;
        console.log(data);

        // hide loading
        dataLoading.style.display = "none";
        drawTableRow(rowsData);
      },
    }); //ajax done
  } else {
    //update current page
    tableState.currentPage = pageId;
    document.querySelector(".current-page-btn > b > span").innerHTML = pageId;

    $.ajax({
      type: "POST",
      url: "includes/fetch_bm_orders.php",
      data: {
        pageId,
      },
      success: function (data) {
        data = JSON.parse(data);
        let rowsData = data.data;
        tableState.totalPages = Math.ceil(data.total_rows / 10);
        document.querySelector(".total-pages").innerHTML =
          tableState.totalPages === 0 ? 1 : tableState.totalPages;

        // hide loading
        dataLoading.style.display = "none";
        drawTableRow(rowsData);
      },
    }); //ajax ended
  } //else ended
} //fetchdata ended

fetchData(1); //run on page load

// Auto-refresh scratch table every 15 minutes (900000 ms)
setInterval(function() {
  $.ajax({
    type: "POST",
    url: "includes/refresh_bm_scratch.php",
    success: function(response) {
      let res = JSON.parse(response);
      if (res.success) {
        console.log("Scratch table refreshed. Inserted: " + res.inserted);
        // Refresh the current page data after successful sync
        fetchData(tableState.currentPage);
      } else {
        console.error("Refresh failed: " + res.error);
      }
    },
    error: function(xhr, status, error) {
      console.error("AJAX error during refresh: " + error);
    }
  });
}, 900000); // 15 minutes

// add data to table on every ajax call
const drawTableRow = function (rowsData) {
  let tbody = document.getElementsByTagName("tbody")[0];
  // create row for each data
  tbody.innerHTML = "";
  if(!rowsData.length){
    let tr = document.createElement("tr");
    tr.innerHTML = `<tr style="background:#dd4b39!important;">
      <td colspan="9">
        <h4 class="text-center">No Data! :(</h4>
      </td>
    </tr>`;
    tbody.appendChild(tr);
  }
  else {
  rowsData.forEach((val) => {
    let tr = document.createElement("tr");
    let {
      id,
      api_timestamp,
      bm_order_id,
      customer_name,
      sku,
      imei,
      state,
      shipper,
      tracking_number,
      sales_order_id,
      goodsout_order_id,
      customer_id,
      is_completed
    } = val;

    // Simple state text mapping (adjust based on BM API states)
    let stateText = '';
    switch(parseInt(state)) {
      case 3: stateText = 'Awaiting Ship'; break;
      case 4: stateText = 'Shipped'; break;
      default: stateText = 'Unknown (' + state + ')'; break;
    }

    let actionButtons = `
      <a href="/sales/imei_orders/edit_order.php?ord_id=${bm_order_id}" class="btn btn-info">
        <i class="fa fa-pencil"></i> Edit
      </a>
      <a href="../../orders/imei/new_order.php?sales_order=${bm_order_id}&cust=CST-78" class="btn btn-primary">
        <i class="fa fa-plus"></i> New BM Goods Out
      </a>
    `;

    tr.innerHTML = `<tr>
          <td>${moment(api_timestamp).format('DD-MM-YYYY')}</td>
          <td>${bm_order_id}</td>
          <td>${customer_name}</td>
          <td>${sku}</td>
          <td>${imei}</td>
          <td>${stateText}</td>
          <td>${shipper}</td>
          <td>${tracking_number}</td>
          <td>${actionButtons}</td>
        </tr>`;
    tbody.appendChild(tr);
  });
  }
};

// assign click event to prev next button
let prevNextBtn = document.getElementsByClassName("prev-next-btn");
for (let i = 0; i < prevNextBtn.length; i++) {
  prevNextBtn[i].addEventListener("click", function (e) {
    if (this.dataset.value === "next") {
      if (tableState.currentPage < tableState.totalPages)
        tableState.currentPage++;
      else return;
    } else if (this.dataset.value === "previous") {
      if (tableState.currentPage > 1) tableState.currentPage--;
      else return;
    }
    dataLoading.style.display = "block";
    fetchData(tableState.currentPage);
  });
}

//search datatable
const searchInput = document.querySelector(".search-datatable");
searchInput.onkeyup = debounce(function() {
  if (this.value.length <= 0) {
    fetchData(tableState.currentPage);
  } else {
    fetchData(null, this.value.trim());
  }
}, 250);

function debounce(func, wait, immediate) {
	var timeout;
	return function() {
		var context = this, args = arguments;
		var later = function() {
			timeout = null;
			if (!immediate) func.apply(context, args);
		};
		var callNow = immediate && !timeout;
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
		if (callNow) func.apply(context, args);
	};
};