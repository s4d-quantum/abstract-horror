// show loading text by default
let dataLoading = document.querySelector(".data-loading");
(dataLoading.style.display = "block"),
  // Global Table state
  (tableState = {
    currentPage: 1,
    totalPages: undefined,
  });

let suppliersList = [];
const fetchSuppliers = (callback) => {
  $.ajax({
    type: "POST",
    url: "includes/fetch_suppliers.php",
    success: function (data) {
      let D = JSON.parse(data);
      suppliersList = [...D];
      callback();
    },
    error: function (data) {},
  });
};

function countTotalRows() {
  $.ajax({
    type: "POST",
    url: "includes/fetch_total_rows_count.php",
    success: function (data) {
      let D = JSON.parse(data);
      tableState.totalPages = Math.ceil(D / 10);
      document.querySelector(".total-pages").innerHTML =
        tableState.totalPages === 0 ? 1 : tableState.totalPages;
    },
    error: function (err) {
      console.log("ERROR:: ", err);
    },
  });
}

// fetch datatable data
function fetchData(pageId, purchase_id) {
  // if search input and not pagination input
  dataLoading.style.display = "block";
  if (arguments[0] === null) {
    $.ajax({
      type: "POST",
      url: "includes/fetch_repair_history_data.php",
      data: {
        purchase_id,
      },
      success: function (data) {
        data = JSON.parse(data);
        let rowsData = data.data;
        console.log(data);

        // hide loading
        dataLoading.style.display = "none";
        if (rowsData.length) {
          fetchSuppliers(() => {
            // drawing table as callback after suppliers are fetched
            drawTableRow(rowsData);
          });
        } else {
          drawTableRow(rowsData);
        }
      },
    }); //ajax done
  } else {
    //update current page
    tableState.currentPage = pageId;
    document.querySelector(".current-page-btn > b > span").innerHTML = pageId;

    $.ajax({
      type: "POST",
      url: "includes/fetch_repair_history_data.php",
      data: {
        pageId,
      },
      success: function (data) {
        data = JSON.parse(data);
        let rowsData = data.data;

        countTotalRows();

        // hide loading
        dataLoading.style.display = "none";
        if (rowsData.length) {
          fetchSuppliers(() => {
            // drawing table as callback after suppliers are fetched
            drawTableRow(rowsData);
          });
        } else {
          drawTableRow(rowsData);
        }
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
        supplier_id,
        tray_id,
        status,
        purchase_return,
        repair_completed,
        repair_required,
      } = val;
      let sup = suppliersList.find((c) => {
        return c.supplier_id === supplier_id;
      }).name;

      tr.innerHTML = `<tr>
            <td>${date}</td>
            <td>${purchase_id}</td>
            <td>${sup}</td>
            <td>${
              repair_completed == 1
                ? '<span class="label label-success">Completed</span>'
                : '<span class="label label-danger">Incomplete</span>'
            }
            <td>
            <td>
              <a href="edit_repair.php?pur_id=${purchase_id}" class="btn btn-warning">
              <i class="fa fa-pencil"></i></a>
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
searchInput.onkeyup = debounce(function () {
  if (this.value.length <= 0) {
    fetchData(tableState.currentPage);
  } else {
    fetchData(null, this.value.trim());
  }
}, 250);

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

// export btn
$(document).on("click", ".export-btn", function (e) {
  const { repairId, supId } = this.dataset;
  $(this).attr("disabled", "");
  fetchExportData({
    repairId,
    supId,
  });
  e.preventDefault();
});

function fetchExportData({ repairId, supId }) {
  $.ajax({
    type: "POST",
    url: "includes/fetch_export_data.php",
    data: {
      repair_id: repairId,
    },
    success: function (data) {
      data = JSON.parse(data);
      console.log(data);
      if (data.length) {
        generate_random_file(repairId, supId, data);
        $(".export-btn").removeAttr("disabled");
      } else {
        alert("Please update Repair.");
        $(".export-btn").removeAttr("disabled");
      }
    },
  }); //ajax ended
}

// Generate excel file
function generate_random_file(repairId, supId, result) {
  var aoo = result;
  var ws = XLSX.utils.json_to_sheet(aoo);
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  const supp = supId.split(" ").join("-"); //remove space from supp id
  XLSX.writeFile(wb, `Repair_${supp}_${repairId}.xlsx`);
}
