// show loading text by default
let dataLoading = document.querySelector(".data-loading");
(dataLoading.style.display = "block"),
  // Global Table state
  (tableState = {
    currentPage: 1,
    totalPages: undefined,
  });

// Datatable filters input
let searchInput = null;
let searchSupplier = null;
let searchStatus = null;

// fetch total data rows
function totalDataPages() {
  $.ajax({
    type: "POST",
    url: "includes/fetch_total_rows_count.php",
    data: {
      searchInput,
      searchSupplier,
      searchStatus,
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
    url: "includes/fetch_qc_history_data.php",
    data: {
      pageId,
      searchInput,
      searchSupplier,
      searchStatus,
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
        date,
        purchase_id,
        supplier,
        tray_id,
        status,
        purchase_return,
        qc_completed,
        qc_required,
      } = val;

      tr.innerHTML = `<tr>
            <td>${date}</td>
            <td>${purchase_id}</td>
            <td>${tray_id}</td>
            <td>${supplier}</td>
            <td>${
              qc_completed == 1
                ? '<span class="label label-success">Completed</span>'
                : '<span class="label label-danger">Incomplete</span>'
            }
            <td>
            <td>
              <a href="edit_qc.php?pur_id=${purchase_id}" class="btn btn-warning">
              <i class="fa fa-pencil"></i></a>

              <button data-qc-id="${purchase_id}" data-sup-id="${supplier}"
                name="export-to-excel" 
                class="btn bg-purple export-btn">
                <i class="fa fa-download"></i> Export
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

function debounce(func, wait, immediate) {
  var timeout;
  return function () {
    let context = this;
    let args = arguments;
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

document.querySelector(".search-datatable").onkeyup = debounce(function () {
  searchInput = this.value.trim();
  fetchData(null);
}, 250);

// confirm deleting item
$(document).on("click", ".del_btn", function (e) {
  const userConfirm = confirm("Are you sure you want to Delete it?");
  if (userConfirm == false) {
    e.preventDefault();
  }
});

// Supplier menu
document.querySelector(".search_supplier").onchange = debounce(function () {
  searchSupplier = this.value.trim();
  fetchData(null);
}, 250);

// status menu
document.querySelector(".search_status").onchange = debounce(function () {
  searchStatus = this.value.trim();
  fetchData(null);
}, 250);

// export btn
$(document).on("click", ".export-btn", function (e) {
  const { qcId, supId } = this.dataset;
  $(this).attr("disabled", "");
  fetchExportData({
    qcId,
    supId,
  });
  e.preventDefault();
});

function fetchExportData({ qcId, supId }) {
  $.ajax({
    type: "POST",
    url: "includes/fetch_export_data.php",
    data: {
      qc_id: qcId,
    },
    success: function (data) {
      data = JSON.parse(data);
      console.log(data);
      if (data.length) {
        generate_random_file(qcId, supId, data);
        $(".export-btn").removeAttr("disabled");
      } else {
        alert("Please update QC.");
        $(".export-btn").removeAttr("disabled");
      }
    },
  }); //ajax ended
}

// Generate excel file
function generate_random_file(qcId, supId, result) {
  var aoo = result;
  var ws = XLSX.utils.json_to_sheet(aoo);
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  const supp = supId.split(" ").join("-"); //remove space from supp id
  XLSX.writeFile(wb, `QC_${supp}_${qcId}.xlsx`);
}
