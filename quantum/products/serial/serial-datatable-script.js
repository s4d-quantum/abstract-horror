// show loading text by default
let dataLoading = document.querySelector(".data-loading");
$(".view-summary-btn").hide();

$("#from_date").datepicker({
  autoclose: true,
  format: "yyyy/mm/dd",
});

$("#to_date").datepicker({
  autoclose: true,
  format: "yyyy/mm/dd",
});

// Global constants
let SEARCH_SERIAL = "SEARCH_SERIAL",
  SEARCH_MODEL = "SEARCH_MODEL",
  SEARCH_FILTER = "SEARCH_FILTER",
  FILTERDATA = "FILTERDATA";

// get search params from url
const urlParams = new URLSearchParams(window.location.search);

// Global Table state
let tableState = {
  currentPage: 1,
  totalPages: 0,
  stockType: urlParams.get("TYPE") || "instock",
  customer: urlParams.get("CUSTOMER") || null,
  supplier: urlParams.get("SUPPLIER") || null,
  category: urlParams.get("CATEGORY") || null,
  grade: urlParams.get("GRADE") || null,
  tray: urlParams.get("TRAY") || null,
  fromDate: urlParams.get("FROMDATE") || null,
  toDate: urlParams.get("TODATE") || null,

  filterStatus: null, //SEARCH_MODEL,SEARCH_SERIAL, SEARCH_FILTER
  searchMODEL: null,
  searchSERIAL: null,
  exportData: [],

  enableExport: 0, //enable export
};

let summaryDataset = [];

// set tablestate.filterStatus to FILTERDATA if there is any query in url
const {
  customer,
  supplier,
  category,
  grade,
  tray,
  fromDate,
  toDate,
  stockType,
} = tableState;
if (
  customer ||
  supplier ||
  category ||
  grade ||
  tray ||
  fromDate ||
  toDate ||
  stockType
) {
  tableState.filterStatus = SEARCH_FILTER;
}

// Find/Search brand
let brandOptions = Array.prototype.slice.call(
  document.querySelectorAll(".brands-field option")
);
function findBrand(brandId) {
  let selectedBrand = "";
  if (brandId) {
    // fetch brands
    selectedBrand = brandOptions.find(
      (option) => option.value === brandId
    ).textContent;
  }
  return selectedBrand;
}

// Find/Search supplier
let supplierOptions = Array.prototype.slice.call(
  document.querySelectorAll(".supplier-field option")
);

function findSupplier(supplierId) {
  let selectedSupplier = "";
  if (supplierId) {
    selectedSupplier = supplierOptions.find(
      (option) => option.value === supplierId
    ).textContent;
  }
  return selectedSupplier;
}

// Get Grades
let gradesList = document.querySelectorAll(".grade-list > span"),
  grades = [];
for (let i = 0; i < gradesList.length; i++) {
  let content = gradesList[i].innerHTML;
  grades.push({
    id: content.slice(content.indexOf("-") + 1, content.length),
    title: content.slice(0, content.indexOf("-")),
  });
}

// find grades
function findGrade(gradeId) {
  let grade = "";
  if (parseInt(gradeId) > 0) {
    if (grades.length) {
      grade = grades.filter((item) => {
        return item.id === gradeId;
      })[0].title;
    }
  } else {
    grade = "-";
  }
  return grade;
}

// fetch total data rows
function totalDataPages() {
  let { filterStatus, searchSERIAL } = tableState;
  if (filterStatus === SEARCH_FILTER || filterStatus === SEARCH_MODEL) {
    const {
      customer,
      supplier,
      category,
      grade,
      tray,
      fromDate,
      toDate,
      stockType,
      searchMODEL,
    } = tableState;
    $.ajax({
      type: "POST",
      url: "includes/fetch-total-data-rows.php",
      data: {
        customer,
        supplier,
        category,
        grade,
        tray,
        fromDate,
        toDate,
        searchMODEL,
        stockType,
      },
      success: function (data) {
        let total = JSON.parse(data);
        $(".total_rows > span").html(total);
        total = parseInt(total / 10) <= 0 ? 1 : Math.ceil(total / 10);
        tableState.totalPages = total;
        $(".total-pages").html(total);
      },
    }); //ajax ended
  } else if (filterStatus === SEARCH_SERIAL) {
    $(".view-summary-btn").hide();
    $.ajax({
      type: "POST",
      url: "includes/fetch-total-data-rows.php",
      data: {
        searchSERIAL,
      },
      success: function (data) {
        $(".view-summary-btn").show();
        let total = JSON.parse(data);
        $(".total_rows > span").html(1);
        total = parseInt(total / 10) <= 0 ? 1 : Math.ceil(total / 10);
        tableState.totalPages = total;
        $(".total-pages").html(total);
      },
    }); //ajax ended
  }
}

// fetch datatable data
function fetchData() {
  dataLoading.style.display = "block";
  const {
    customer,
    supplier,
    category,
    grade,
    tray,
    fromDate,
    toDate,
    stockType,
    currentPage,
    filterStatus,
    searchSERIAL,
    searchMODEL,
  } = tableState;

  // Search IMEI
  if (filterStatus === SEARCH_SERIAL) {
    $(".view-summary-btn").hide();

    $.ajax({
      type: "POST",
      url: "includes/fetch-serial-inventory-data.php",
      data: {
        stockType,
        searchSERIAL,
      },
      success: function (data) {
        data = JSON.parse(data);
        let rowsData = data.data;

        if (rowsData.length) {
          $(".no-data-error").html("");
          $(".table").show();
          drawTableRow(rowsData, FILTERDATA);
          totalDataPages();
        } else {
          $(".no-data-error").html("No data to show..");
          $(".table").hide();
        }
      },
    }); //ajax done
  }
  // Apply Filter and pagination
  else if (filterStatus === SEARCH_FILTER || filterStatus === SEARCH_MODEL) {
    document.querySelector(".current-page-btn > b > span").innerHTML =
      currentPage;

    $.ajax({
      type: "POST",
      url: "includes/fetch-serial-inventory-data.php",
      data: {
        customer,
        supplier,
        category,
        searchMODEL,
        grade,
        tray,
        fromDate,
        toDate,
        stockType,
        pageId: currentPage,
      },
      success: function (data) {
        data = JSON.parse(data);

        let rowsData = data.data;

        totalDataPages();

        if (rowsData.length) {
          $(".no-data-error").html("");
          $(".table").show();
          drawTableRow(rowsData, FILTERDATA);
        } else {
          $(".no-data-error").html("No data to show..");
          $(".table").hide();
        }
      },
    }); //ajax ended

    // export table data
    $.ajax({
      type: "POST",
      url: "includes/fetch_inventory_export_data.php",
      data: {
        customer,
        supplier,
        category,
        searchMODEL,
        grade,
        tray,
        fromDate,
        toDate,
        stockType,
        pageId: currentPage,
      },
      success: function (data) {
        data = JSON.parse(data);
        let rowsData = data.data;

        // enable export button when data is available
        if (rowsData.length) {
          $(".exportexcel").removeAttr("disabled");
        }

        // replace supplier id with supplier name in whole rows before exporting
        let mappedData = rowsData.map((row) => ({
          PID: row.purchase_id,
          TrayID: row.tray_id,
          Item_Code: row.item_code,
          Details: row.item_details,
          Brand: findBrand(row.item_brand),
          Grade: findGrade(row.item_grade),
          Supplier: findSupplier(row.supplier_id),
          Status: row.status == 1 ? "Available" : "Not Available",
        }));
        // export now
        tableState.exportData = [...mappedData];

        if (rowsData.length) {
          drawTableRow(rowsData);
          /* draw summary table */
          $(".view-summary-btn").show();
          drawSummaryData();
        }
      },
    }); //ajax ended
    // export table data
  } //else ended
} //fetchdata ended

// run fetch data on page reload based on search query values
fetchData();

// Redraw datatable
// $(".custom_datatable").hide();
const drawTableRow = function (rowsData, isFilterData) {
  summaryDataset = []; //renew summary before each search
  $(".custom_datatable").show();

  // tbody of searched data table
  let tbodySearchedData = document.getElementsByTagName("tbody")[1];

  // update total rows count
  $(".total_rows > span").html();

  // // create row for each data
  if (isFilterData === FILTERDATA) tbodySearchedData.innerHTML = "";

  rowsData.forEach((val) => {
    let {
      purchase_id,
      item_code,
      supplier_id,
      item_grade,
      item_details,
      item_brand,
      status,
      purchase_return,
    } = val;

    /* category */
    let category = "";
    if (val.item_brand.length > 0) category = findBrand(item_brand);
    else category = "";

    /* grade */
    let grade = "";
    if (parseInt(val.item_grade) > 0) {
      grade = grades.filter((item) => {
        return item.id === item_grade;
      })[0].title;
    } else {
      grade = "-";
    }

    /* supplier */
    let supplier = "";
    if (val.supplier_id.length > 0) supplier = findSupplier(supplier_id);
    else supplier = "";

    summaryDataset.push({
      purchase_id,
      item_code,
      category,
      supplier,
      grade,
      item_details,
      purchase_return,
      status,
    });

    if (isFilterData === FILTERDATA) {
      let trSearchedItems = document.createElement("tr");
      trSearchedItems.innerHTML = `<tr>
                <td>
                    ${purchase_id}
                </td>
                <td><a href="item_serial_details.php?item_code=${item_code}" target="_blank">${item_code}</a></td>
                <td>
                    ${category}
                </td>
                <td>
                    ${supplier}
                </td>
                <td>
                    ${grade}
                </td>
                <td>
                    ${item_details}
                </td>
                <td>
                    ${
                      purchase_return == 1
                        ? "Out of stock"
                        : status == 1
                        ? "In Stock"
                        : "Out of stock"
                    }
                </td>
            </tr>`;
      tbodySearchedData.appendChild(trSearchedItems);
    }
  });

  // hide loading
  dataLoading.style.display = "none";
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
    fetchData();
  });
}

//search imei
const searchSerialBtn = document.querySelector(".search-datatable");
const searchSerialInput = document.querySelector(".search-datatable-input");
searchSerialBtn.onclick = function (e) {
  tableState.currentPage = 1;
  if (searchSerialInput.value.length > 0) {
    tableState.filterStatus = SEARCH_SERIAL;
    tableState.searchSERIAL = searchSerialInput.value.trim();
    fetchData();
  } else {
    alert("Invalid item ID!!!!");
    tableState.currentPage = 1;
    tableState.filterStatus = SEARCH_FILTER;
    fetchData();
  }
};

//search model
const searchModel = document.querySelector(".search-model");
const searchModelInput = document.querySelector(".search-model-input");
searchModel.onclick = function (e) {
  e.preventDefault();
  filtersCalled();
};

function filtersCalled() {
  tableState.currentPage = 1;

  // get current url before query
  let url = `${window.location.href.split("?")[0]}?`;

  let searchModelInput = document.querySelector(".search-model-input");
  // Model filter
  if (searchModelInput.value.length > 0) {
    tableState.searchMODEL = searchModelInput.value.trim();
  } else {
    tableState.searchMODEL = null;
  }

  // Stock type filter
  let stockType = document.getElementsByClassName("select-stock-type")[0].value;
  if (stockType.length <= 0) {
    stockType = null;
  }
  tableState.stockType = stockType;
  url = updateUrl(url, stockType, "TYPE", tableState.stockType);

  // Customer filter
  let customer = document.getElementsByClassName("select-customer")[0].value;
  if (customer.length <= 0) {
    customer = null;
  }
  tableState.customer = customer;
  url = updateUrl(url, customer, "CUSTOMER", tableState.customer);

  // Category filter
  let category = document.getElementsByClassName("select-category")[0].value;
  if (category.length <= 0) {
    category = null;
  }
  tableState.category = category;
  url = updateUrl(url, category, "CATEGORY", tableState.category);

  // Tray filter
  let tray = document.getElementsByClassName("select-tray")[0].value;
  if (tray.length <= 0) {
    tray = null;
  }
  tableState.tray = tray;
  url = updateUrl(url, tray, "TRAY", tableState.tray);

  // Supplier filter
  let supplier = document.getElementsByClassName("select-supplier")[0].value;
  if (supplier.length <= 0) {
    supplier = null;
  }
  tableState.supplier = supplier;
  url = updateUrl(url, supplier, "SUPPLIER", tableState.supplier);

  // grade filter
  let grade = document.getElementsByClassName("select-grade")[0].value;
  if (grade.length <= 0) {
    grade = null;
  }
  tableState.grade = grade;
  url = updateUrl(url, grade, "GRADE", tableState.grade);

  // fromDate filter
  let fromDate = document.getElementsByClassName("from_date")[0].value;
  if (fromDate.length <= 0) {
    fromDate = null;
  }
  tableState.fromDate = fromDate;
  // UPDATE URL
  url = updateUrl(url, fromDate, "FROMDATE", tableState.fromDate);

  // toDate filter
  let toDate = document.getElementsByClassName("to_date")[0].value;
  if (toDate.length <= 0) {
    toDate = null;
  }
  tableState.toDate = toDate;

  // reload when window.location.href needs to b updated
  window.history.pushState(
    {},
    "",
    updateUrl(url, toDate, "TODATE", tableState.toDate)
  );

  tableState.filterStatus = SEARCH_FILTER;
  fetchData();
}

function updateUrl(url, param, key, value) {
  // UPDATE URL
  if (param !== null) {
    url = `${url}&${key}=${value}`;

    if (url.indexOf("?&") > 0) {
      url = url.replace("?&", "?");
    }
  }
  return url;
}

// callback when any summary filter changes
function drawSummaryData() {
  // add unique details
  let selectedArray = [];
  let temp = summaryDataset;

  // empty tbody on each filter button clicked
  $(".summary-table tbody").html("");

  // Group requiredItems and calculate total count
  selectedArray = _.groupBy(summaryDataset, (item) => {
    return `${
      item.category.split(" ").join("") +
      item.item_details.split(" ").join("") +
      item.grade.split(" ").join("") +
      item.supplier.split(" ").join("")
    }`;
  });
  selectedArray = _.toArray(selectedArray).map((group) => ({
    ...group[0],
    total: group.length,
  }));

  selectedArray.forEach((item) => {
    let { category, supplier, grade, item_details, total } = item;
    grade = grade !== "-" ? `Grade ${grade}` : "";
    let tr = `<tr>
            <td colspan="4"><b>
                <span style="text-transform:capitalize;" class="selected-category">${category} </span>
                <span style="text-transform:capitalize;" class="selected-model">${item_details}</span>
                <span style="text-transform:capitalize;" class="selected-grade">${grade}</span>  
                <span class="selected-supplier" style="font-weight:normal">--- ${supplier}</span>
            </td>`;

    tr +=
      total > 0
        ? `<td class="total-summary-count" style="font-weight:bold;">
                Total: ${total}
            </td>`
        : `<td class="total-summary-count" style="color:red; font-weight:bold;">
                Total: ${total}
            </td>`;
    tr += `</tr>`;
    $(".summary-table tbody").append(tr);
  });
}

// enable export
$(".exportexcel").on("click", function (e) {
  e.preventDefault();
  fetchExportData();
});

/* 
----------
Generate Export file
-----------
 */

$(".exportexcel").attr("disabled", "disabled");
function fetchExportData() {
  if (tableState.exportData.length) {
    $(".exportexcel").removeAttr("disabled");
    generate_random_file(tableState.exportData);
  } else {
    alert("No export row available!");
  }
} //fetchdata ended

function generate_random_file(result) {
  var aoo = result;
  var ws = XLSX.utils.json_to_sheet(aoo);
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, `Inventory.xlsx`);
}
/*
----------
Generate Export file Ended
-----------
 */
