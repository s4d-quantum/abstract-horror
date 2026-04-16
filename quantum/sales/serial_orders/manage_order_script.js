// show loading text by default
let dataLoading = document.querySelector(".data-loading");
let userSession = document.querySelector("#user_id").dataset;
let selectedOrderId = "";

// Find/Search Grade
function fetchGrade(id) {
  let D = document;
  let categories = D["querySelectorAll"](".fetch_grades option");
  let selected = "";
  categories.forEach((item) => {
    if (item.value === id) {
      selected = item.innerHTML;
    }
  });
  return selected.trim();
}

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

// fetch categories
// fetch categories by category ID
function fetchCategoryName(id) {
  let D = document;
  let categories = D["querySelectorAll"](".fetch_categories option");
  let selected = "";
  categories.forEach((item) => {
    if (item.value === id) {
      selected = item.innerHTML;
    }
  });
  return selected.trim();
}

const fetchSuppliers = (callback, rows) => {
  $.ajax({
    type: "POST",
    url: "../imei_orders/includes/fetch_suppliers.php",
    success: function (data) {
      let D = JSON.parse(data);
      // suppliersList = [...D];
      const items = rows.map((row) => {
        return {
          Serial: row.item_code,
          Details: row.item_details,
          Brand: fetchCategoryName(row.item_brand),
          Supplier: D.find(
            (supplier) => supplier.supplier_id === row.supplier_id
          ).name,
          Grade: fetchGrade(row.item_grade),
        };
      });
      callback(items);
    },
    error: function (data) {},
  });
};

// Get users
let usersList = document.querySelectorAll(".user-list > span"),
  users = [];
for (let i = 0; i < usersList.length; i++) {
  let content = usersList[i].innerHTML;
  users.push({
    id: content.slice(content.indexOf("%") + 1, content.length),
    name: content.slice(0, content.indexOf("%")),
  });
}

// get customers
function getCustomer(cstId) {
  return customers.find((customer) => cstId === customer.id).name;
}

// get usesrs
function getUser(userId) {
  return users.find((user) => userId === user.id).name;
}

(dataLoading.style.display = "block"),
  // Global Table state
  (tableState = {
    currentPage: 1,
    totalPages: undefined,
  });

// fetch datatable data
function fetchData(pageId, order_id) {
  dataLoading.style.display = "block";
// if search input and not pagination input
  if (arguments[0] === null) {
    $.ajax({
      type: "POST",
      url: "includes/fetch_sales_orders.php",
      data: {
        order_id,
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
      url: "includes/fetch_sales_orders.php",
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

// add data to table on every ajax call
const drawTableRow = function (rowsData) {
  let tbody = document.getElementsByTagName("tbody")[0];
  // create row for each data
  tbody.innerHTML = "";
  if(!rowsData.length){
    let tr = document.createElement("tr");
    tr.innerHTML = `<tr style="background:#dd4b39!important;">
      <td colspan="7">
        <h4 class="text-center">No Data! :(</h4>
      </td>
    </tr>`;
    tbody.appendChild(tr);
  }
  else {
  rowsData.forEach((val) => {
    let tr = document.createElement("tr");
    let {
      order_id,
      date,
      customer_id,
      user_id,
      is_completed,
      goodsout_order_id,
    } = val;

    is_completed = parseInt(is_completed);
    tr.innerHTML = `<tr>
          <td>${date}</td>
          <td>${order_id}</td>
          <td>${getCustomer(customer_id)}</td>
          <td>${getUser(user_id)}</td>
          
          <td>
            ${
              !!is_completed
                ? `<a href="../../orders/serial/serial_order_details.php?ord_id=${goodsout_order_id}"
                class="btn btn-warning">
                <i class="fa fa-search"></i> View
                </a>
                <button class="btn btn-purple bg-purple export-excel"
                  data-order-id="${goodsout_order_id}">
                  <i class="fa fa-download"></i> Export</button>
                `
                : `
                ${
                  userSession.isAdmin === "admin"
                    ? `<a href="edit_order.php?ord_id=${order_id}"
                class="btn btn-info">
                <i class = "fa fa-pencil"></i> Edit
              </a>
              <a href="../../orders/serial/new_serial_order.php?sales_order=${order_id}&cust=${customer_id}"
                class="btn btn-primary">
                 New Serial Goodsout
              </a>`
                    : `<a href="../../orders/serial/new_serial_order.php?sales_order=${order_id}&cust=${customer_id}"
                class="btn btn-primary">
                 New Serial Goodsout
              </a>`
                }
            `
            }
    
          </td>
        </tr>`;
      tbody.appendChild(tr);
    });
  }
};

// assign click event on each page button
let pageNum = document.getElementsByClassName("page-item");
for (let i = 0; i < pageNum.length; i++) {
  pageNum[i].addEventListener("click", function () {
    dataLoading.style.display = "block";
    fetchData(i + 1);
  });
}

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

//search datable
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

// confirm deleting item
$(document).on("click", ".del_btn", function (e) {
  const userConfirm = confirm("Are you sure you want to Delete it?");
  if (userConfirm == false) {
    e.preventDefault();
  }
});

$(document).on("click", ".export-excel", function () {
  selectedOrderId = this.dataset.orderId;
  $.ajax({
    type: "POST",
    url: "includes/fetch-sales-report.php",
    data: {
      order_id: selectedOrderId,
    },
    success: function (data) {
      const d = JSON.parse(data);
      fetchSuppliers(generate_random_file, d);
    },
  }); //ajax ended
});

function generate_random_file(result) {
  const aoo = result;
  const ws = XLSX.utils.json_to_sheet(aoo);
  const wb = XLSX.utils.book_new();
  let date = new Date();
  date = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, `SSO_${selectedOrderId}_${date}.xlsx`);
}
