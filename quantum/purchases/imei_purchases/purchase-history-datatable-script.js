// fetching user role for priority work
let user_id = document.querySelector(".user_id").value;
let user_role = document.querySelector(".user_role").value;

// Datatable filters input
let searchInput = null;
let searchSupplier = null;
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

// show loading text by default
let dataLoading = document.querySelector(".data-loading");
(dataLoading.style.display = "block"),
  // Global Table state
  (tableState = {
    currentPage: 1,
    totalPages: undefined,
  });

// fetch total data rows
function totalDataPages() {
  $.ajax({
    type: "POST",
    url: "includes/fetch-purchase-history-total-pages.php",
    data: {
      searchInput,
      searchSupplier,
      fromDate,
      toDate,
    },
    success: function (data) {
      data = JSON.parse(data);
      tableState.totalPages = Math.ceil(data.total_rows / 10);

      document.querySelector(".total-pages").innerHTML =
        tableState.totalPages === 0 ? 1 : tableState.totalPages;
    },
  }); //ajax ended
}

// fetch datatable data
function fetchData(pageId) {
  // if search input and not pagination input
  dataLoading.style.display = "block";
  //update current page
  tableState.currentPage = pageId ? pageId : 1;
  document.querySelector(".current-page-btn > b > span").innerHTML =
    tableState.currentPage;
  $.ajax({
    type: "POST",
    url: "includes/fetch-purchase-history-data.php",
    data: {
      pageId,
      searchInput,
      searchSupplier,
      fromDate,
      toDate,
    },
    success: function (data) {
      data = JSON.parse(data);
      let rowsData = data.data;

      tableState.totalPages = Math.ceil(data.total_rows / 10);

      // hide loading
      dataLoading.style.display = "none";

      // calculate total pages
      totalDataPages();

      drawTableRow(rowsData);
    },
  }); //ajax done
} //fetchdata ended

fetchData(1); //run on page load

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
      let {
        purchase_id,
        date,
        supplier,
        qc_required,
        priority,
        total,
        purchase_return,
        has_return_tag,
      } = val;

      // priority work
      let priorityColor = "";
      if (priority == 1) priorityColor = "bg-red";
      else if (priority == 2) priorityColor = "bg-orange";
      else if (priority == 3) priorityColor = "bg-green";
      else if (priority == 4) priorityColor = "bg-blue";
      else if (priority == 5) priorityColor = "bg-teal";

      tr.innerHTML += `<tr style="background:#dd4b39!important;">
          <td class="${priorityColor}">
            ${purchase_id}
            <input type="text" value=${purchase_id} class="purchase_id hide"/>
            </br>
            ${
              (has_return_tag === "0" || has_return_tag === null) &&
              purchase_return === "1"
                ? `<div class="btn-group">
                <label class="btn-xs btn bg-purple">${
                  purchase_return === "1" ? "returns" : ""
                }</label>
                ${
                  user_role === "admin"
                    ? `<button class="btn-xs btn bg-navy" onclick="clearReturnTag(${purchase_id})">x</button>`
                    : ""
                }
              </div>`
                : ""
            }
          </td>
          <td>${date}</td>
          <td>${supplier}</td>
          <td>${qc_required == 1 ? "Yes" : "No"}</td>
          <td>
              <a href="purchase_details.php?pur_id=${purchase_id}"
                  class="btn btn-primary">
                  <i class="fa fa-search"></i>
              </a>
              <a href="edit_purchase.php?pur_id=${purchase_id}"
                  class="btn btn-warning">
                  <i class = "fa fa-pencil"></i>
              </a>
          </td>
          <td class="${user_role == "admin" ? "" : "hidden"}">
          <div style="display:flex;">
              <b style="margin-right:10px;">${
                priority != 0 && priority !== null ? priority : ""
              }</b>
              <select class="change_priority">
                  <option value="0">0</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
              </select>
              <button class="change_priority_btn btn bg-purple btn-sm">
              <i class="fa fa-check"></i></button>
          </div>
          </td>
          <td>${total}</td>
        </tr>`;
      tbody.appendChild(tr);
    });
  }
};

// Clear Return tag from purchase in purchase history table
function clearReturnTag(purchase_id) {
  $.ajax({
    type: "POST",
    url: "includes/clear-return-tag-from-purchase.php",
    data: {
      purchase_id,
      user_id,
    },
    success: function (data) {
      // update datatable
      fetchData(null);
    },
  }); //ajax ended
}

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

// //search datable
//

// Adding fetchData call on inputs change events
// Search box
document.querySelector(".search-datatable").onkeyup = debounce(function () {
  searchInput = this.value.trim();
  fetchData(null);
}, 250);

// Supplier menu
document.querySelector(".search_supplier").onchange = debounce(function () {
  searchSupplier = this.value.trim();
  fetchData(null);
}, 250);

// from date
document.querySelector(".from_date").onchange = debounce(function () {
  fromDate = this.value.trim();
  fetchData(null);
}, 250);

// from date
document.querySelector(".to_date").onchange = debounce(function () {
  toDate = this.value.trim();
  fetchData(null);
}, 250);

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

// priority change
$(document).on("click", ".change_priority_btn", function (e) {
  let priority = $(this).siblings(".change_priority").val();
  let pid = $(this).parent().parent().siblings().children(".purchase_id").val();
  if (pid) {
    $.ajax({
      type: "POST",
      url: "includes/update_priority.php",
      data: {
        purchase_id: pid,
        priority,
      },
      success: function (data) {
        location.reload();
      },
    });
  } else {
    console.log("sorry");
  }
});
