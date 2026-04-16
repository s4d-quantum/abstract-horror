// show loading text by default
let dataLoading = document.querySelector(".data-loading");
dataLoading.style.display = "block";

// Global Table state
tableState = {
  currentPage: 1,

  getCurrentPage() {
    // read of url query params
    let location = window.location.search.includes("page=")
      ? parseInt(window.location.search.slice(6))
      : this.currentPage;
    return location;
  },

  setCurrentPage(location) {
    this.currentPage = location;

    // append current page to url query params
    const url = new URL(window.location);
    url.searchParams.set("page", this.currentPage);
    window.history.pushState(null, "", url.toString());
  },
  totalPages: undefined,
};

// Datatable filters input
let searchModel = null;
let searchInput = null;
let searchCustomer = null;
let fromDate = null;
let toDate = null;

$("#from_date").datepicker({
  autoclose: true,
  format: "yyyy/mm/dd",
});

$("#to_date").datepicker({
  autoclose: true,
  format: "yyyy/mm/dd",
});

// fetch total data rows
function totalDataPages() {
  $.ajax({
    type: "POST",
    url: "includes/fetch-order-history-total-pages.php",
    data: {
      searchModel,
      searchInput,
      searchCustomer,
      fromDate,
      toDate,
    },
    success: function (data) {
      data = JSON.parse(data);
      tableState.totalPages = Math.ceil(data.total_rows / 10);

      document.querySelector(".total-pages").innerHTML =
        tableState.totalPages === 0 ? 1 : tableState.totalPages;

      // check current page is > total pages then redirect to page 1
      if (tableState.getCurrentPage() > tableState.totalPages) {
        tableState.setCurrentPage(1);
        fetchData(tableState.getCurrentPage());
      }
    },
  }); //ajax ended
}

// fetch datatable data
function fetchData(pageId) {
  dataLoading.style.display = "block";
  //update current page
  tableState.setCurrentPage(pageId ? pageId : 1);
  document.querySelector(".current-page-btn > b > span").innerHTML =
    tableState.getCurrentPage();

  $.ajax({
    type: "POST",
    url: "includes/fetch-order-history-data.php",
    data: {
      pageId,
      searchModel,
      searchInput,
      searchCustomer,
      fromDate,
      toDate,
    },
    success: function (data) {
      data = JSON.parse(data);
      let rowsData = data.data;

      // hide loading
      dataLoading.style.display = "none";
      drawTableRow(rowsData);

      // calculate total pages
      totalDataPages();
    },
  }); //ajax ended
} //fetchdata ended
 
fetchData(tableState.getCurrentPage()); //run on page load

// add data to table on every ajax call
const drawTableRow = function (rowsData) {
  let tbody = document.getElementsByTagName("tbody")[0];
  // create row for each data
  tbody.innerHTML = "";
  if (!rowsData.length) {
    let tr = document.createElement("tr");
    tr.innerHTML = `<tr style="background:#dd4b39!important;">
      <td colspan="7">
        <h4 class="text-center">No Data! :(</h4>
      </td>
    </tr>`;
    tbody.appendChild(tr);
  } else {
    rowsData.forEach((val) => {
      let tr = document.createElement("tr");
      let { order_id, date, customer } = val;

      tr.innerHTML = `<tr>
            <td>${order_id}</td>
            <td>${date}</td>
            <td>${customer}</td>
            <td>
                <a href="accessories_order_return.php?ret=${order_id}"
                    class ="btn bg-gray">
                    Return
                </a>
                <a href="accessories_order_details.php?ord_id=${order_id}"
                    class="btn btn-primary">
                    <i class="fa fa-search"></i>
                </a>
                <a href="edit_accessories_order.php?ord_id=${order_id}"
                    class="btn btn-warning">
                    <i class = "fa fa-pencil"></i>
                </a>
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
      if (tableState.getCurrentPage() < tableState.totalPages)
        tableState.setCurrentPage(tableState.getCurrentPage() + 1);
      else return;
    } else if (this.dataset.value === "previous") {
      if (tableState.getCurrentPage() > 1)
        tableState.setCurrentPage(tableState.getCurrentPage() - 1);
      else return;
    }
    dataLoading.style.display = "block";
    fetchData(tableState.getCurrentPage());
  });
}

// Adding fetchData call on inputs change events
// Search Model
document.querySelector(".search-model").onkeyup = debounce(function () {
  searchModel = this.value.trim();
  // search model is not empty 
  if(searchModel.length){
    fetchData(null);
  }
}, 350);

// Search box
document.querySelector(".search-datatable").onkeyup = debounce(function () {
  searchInput = this.value.trim();
  if(searchInput.length){
    fetchData(null);
  }
}, 350);

// Customer menu
document.querySelector(".search_customer").onchange = debounce(function () {
  searchCustomer = this.value.trim();
  fetchData(null);
}, 350);

// from date
document.querySelector(".from_date").onchange = debounce(function () {
  fromDate = this.value.trim();
  fetchData(null);
}, 350);

// from date
document.querySelector(".to_date").onchange = debounce(function () {
  toDate = this.value.trim();
  fetchData(null);
}, 350);

function debouceCallback() {
  // if (this.value.length <= 0) {
  //   fetchData(tableState.currentPage);
  // } else {
  dataLoading.style.display = "none";
  fetchData(null);
  // }
}
function debounce(func, wait, immediate) {
  var timeout;
  return function () {
    var context = this,
      args = arguments;
    var later = function () {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
}

// confirm deleting item
$(document).on("click", ".del_btn", function (e) {
  const userConfirm = confirm("Are you sure you want to Delete it?");
  if (userConfirm == false) {
    e.preventDefault();
  }
});
