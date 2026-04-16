// Globals
var D = document;
var QS = "querySelector";
var QSA = "querySelectorAll";

// show loading text by default
let dataLoading = D[QS](".data-loading");
let allDataLoaded = false;
var isLoading = true;

$("#from_date").datepicker({
  autoclose: true,
  format: "yyyy/mm/dd",
});

$("#to_date").datepicker({
  autoclose: true,
  format: "yyyy/mm/dd",
});

// Global constants
let SEARCH_IMEI = "SEARCH_IMEI",
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
  gb: urlParams.get("GB") || null,
  color: urlParams.get("COLOR") || null,
  tray: urlParams.get("TRAY") || null,
  fromDate: urlParams.get("FROMDATE") || null,
  toDate: urlParams.get("TODATE") || null,
  isQcDone: urlParams.get("QC_DONE") || null,
  isQcPassed: urlParams.get("QC_PASSED") || null,

  filterStatus: null, //SEARCH_MODEL,SEARCH_IMEI, SEARCH_FILTER
  searchMODEL: null,
  searchIMEI: null,
  exportData: [],
};
let summaryDataset = [];

// set tablestate.filterStatus to FILTERDATA if there is any query in url
const {
  customer,
  supplier,
  category,
  color,
  grade,
  gb,
  tray,
  fromDate,
  toDate,
  stockType,
  isQcDone,
  isQcPassed,
} = tableState;
if (
  customer ||
  supplier ||
  category ||
  color ||
  grade ||
  gb ||
  tray ||
  fromDate ||
  toDate ||
  stockType ||
  isQcDone ||
  isQcPassed
) {
  tableState.filterStatus = SEARCH_FILTER;
}

// Find/Search brand
let brandOptions = Array.prototype.slice.call(D[QSA](".brands-field option"));
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
  D[QSA](".supplier-field option")
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

// Find/Search customer
let custOptions = Array.prototype.slice.call(D[QSA](".select-customer option"));
function findCustomer(customerId) {
  let selectedCustomer = "";
  if (customerId) {
    // fetch customers
    selectedCustomer = custOptions.find(
      (option) => option.value === customerId
    ).textContent;
  }
  return selectedCustomer;
}

// Get grades
let gradesList = D[QSA](".grade-list > span"),
  grades = [];
for (let i = 0; i < gradesList.length; i++) {
  let content = gradesList[i].innerHTML;
  grades.push({
    id: content.slice(content.indexOf("%") + 1, content.length),
    title: content.slice(0, content.indexOf("%")),
  });
}

// find grades
function findGrade(gradeId) {
  let grade = "";
  if (parseInt(gradeId) > 0 && parseInt(gradeId) <= grades.length) {
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
  let { filterStatus, searchMODEL, searchIMEI } = tableState;
  if (filterStatus === SEARCH_FILTER || filterStatus === SEARCH_MODEL) {
    const {
      customer,
      supplier,
      category,
      color,
      grade,
      gb,
      tray,
      fromDate,
      toDate,
      isQcDone,
      isQcPassed,
      stockType,
      currentPage,
      searchMODEL,
    } = tableState;
    $.ajax({
      type: "POST",
      url: "includes/fetch-total-data-rows.php",
      data: {
        customer,
        supplier,
        category,
        color,
        grade,
        gb,
        tray,
        fromDate,
        toDate,
        isQcDone,
        isQcPassed,
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
  } else if (filterStatus === SEARCH_IMEI) {
    // console.log('inside')
    $.ajax({
      type: "GET",
      url: "includes/fetch-total-data-rows.php",
      data: {
        searchIMEI,
      },
      success: function (data) {
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
  console.log("1");
  showHideLoader(); //loader
  const {
    customer,
    supplier,
    category,
    color,
    gb,
    grade,
    tray,
    fromDate,
    toDate,
    isQcDone,
    isQcPassed,
    stockType,
    currentPage,
    filterStatus,
    searchIMEI,
    searchMODEL,
  } = tableState;

  // Search IMEI
  if (filterStatus === SEARCH_IMEI) {
    $.ajax({
      type: "POST",
      url: "includes/fetch-imei-inventory-data.php",
      data: {
        stockType,
        searchIMEI,
      },
      success: function (data) {
        data = JSON.parse(data);
        let rowsData = data.data;

        if (rowsData.length) {
          $(".no-data-error").html("");
          $(".table").show();
          drawTableRow(rowsData, FILTERDATA);
          totalDataPages();
          fetchExportData();
        } else {
          $(".no-data-error").html("No data to show..");
          $(".table").hide();
        }
        console.log("2");

        showHideLoader(); //loader
      },
      error: function () {
        console.log("3");
        showHideLoader(); //loader
      },
    }); //ajax done
  }
  // Apply Filter and pagination
  else if (filterStatus === SEARCH_FILTER || filterStatus === SEARCH_MODEL) {
    // console.log(SEARCH_FILTER);
    D[QS](".current-page-btn > b > span").innerHTML = currentPage;

    $.ajax({
      type: "POST",
      url: "includes/fetch-imei-inventory-data.php",
      data: {
        customer,
        supplier,
        category,
        color,
        gb,
        searchMODEL,
        grade,
        tray,
        fromDate,
        toDate,
        isQcDone,
        isQcPassed,
        stockType,
        pageId: currentPage,
      },
      // xhr: function () {
      //   var xhr = this.context.xhr();
      //   xhr.onprogress = function (e) {
      //     console.log("here inside");
      //     // For downloads
      //     if (e.lengthComputable) {
      //       console.log(e.loaded / e.total);
      //     }
      //   };
      //   xhr.upload.onprogress = function (e) {
      //     console.log("here inside");
      //     // For uploads
      //     if (e.lengthComputable) {
      //       console.log(e.loaded / e.total);
      //     }
      //   };
      //   return xhr;
      // },
      success: function (data) {
        data = JSON.parse(data);

        let rowsData = data.data;
        totalDataPages();

        if (rowsData.length) {
          $(".no-data-error").html("");
          $(".table").show();
          drawTableRow(rowsData, FILTERDATA);
          fetchExportData();
        } else {
          $(".no-data-error").html("No data to show..");
          $(".table").hide();
        }
        console.log("4");
        showHideLoader(); //loader
      },
      error: function () {
        console.log("5");
        showHideLoader(); //loader
      },
    }); //ajax ended
  } //else ended
} //fetchdata ended

// run fetch data on page reload based on search query values
fetchData();

function fetchExportData(callback) {
  allDataLoaded = false; //is all data loaded status
  D[QS](".exportexcel").setAttribute("disabled", "disabled");
  D[QS](".view-summary-btn").setAttribute("disabled", "disabled");
  const {
    customer,
    supplier,
    category,
    color,
    gb,
    grade,
    tray,
    fromDate,
    toDate,
    isQcDone,
    isQcPassed,
    stockType,
    currentPage,
    searchMODEL,
  } = tableState;

  // summary table data
  $.ajax({
    type: "POST",
    url: "includes/fetch_inventory_export_data.php",
    data: {
      customer,
      supplier,
      category,
      color,
      gb,
      searchMODEL,
      grade,
      tray,
      fromDate,
      toDate,
      isQcDone,
      isQcPassed,
      stockType,
      pageId: currentPage,
    },
    success: function (data) {
      data = JSON.parse(data);
      let rowsData = data.data;

      // enable export button when data is available
      if (rowsData.length) {
        D[QS](".exportexcel").removeAttribute("disabled");
        D[QS](".view-summary-btn").removeAttribute("disabled");
      }

      // save data for export
      // replace supplier id with supplier name in whole rows before exporting
      let mappedData = rowsData.map((row) => ({
        PID: row.purchase_id,
        IMEI: row.item_imei,
        TrayID: row.tray_id,
        Color: row.item_color,
        GB: row.item_gb,
        Po_Box: row.po_box,
        Grade: findGrade(row.item_grade),
        Status: row.status == 1 ? "Available" : "Not Available",
        Details: row.item_details,
        Supplier: findSupplier(row.supplier_id),
        Brand: findBrand(row.item_brand),
        Customer: findCustomer(row.customer_id),
        QC_Completed: row.qc_required
          ? row.qc_completed === "1"
            ? "COMPLETED"
            : "INCOMPLETE"
          : "NOT REQUIRED",
        QC_Status:
          row.item_cosmetic_passed === "1" && row.item_functional_passed === "1"
            ? "PASSED"
            : "FAILED",
        QC_Comments: row.item_comments,
      }));

      // export now
      tableState.exportData = [...mappedData];

      if (rowsData.length) {
        drawTableRow(rowsData);
        /* draw summary table */
        drawSummaryData();
      }

      allDataLoaded = true; //is all data loaded status
      if (callback) callback();
    },
    error: function () {
      allDataLoaded = true; //is all data loaded status
      D[QS](".exportexcel").removeAttribute("disabled");
      D[QS](".view-summary-btn").removeAttribute("disabled");
    },
  }); //ajax ended
  // export table data
}

// callback when any summary filter changes
function drawSummaryData() {
  let D = document;
  // add unique details

  // empty tbody on each filter button clicked
  $(".summary-table tbody").html("");

  // Group requiredItems and calculate total count
  selectedArray = _.groupBy(summaryDataset, (item) => {
    return `${
      item.category.split(" ").join("") +
      item.item_color.split(" ").join("") +
      item.item_details.split(" ").join("") +
      item.item_gb.split(" ").join("") +
      item.grade.split(" ").join("") +
      item.supplier.split(" ").join("")
    }`;
  });
  selectedArray = _.toArray(selectedArray).map((group) => ({
    ...group[0],
    total: group.length,
  }));
  // draw summary rows:
  selectedArray.forEach((item) => {
    let {
      category,
      supplier,
      item_color,
      item_gb,
      grade,
      item_details,
      total,
    } = item;
    let tr = `<tr>
            <td colspan="4"><b>
                <span style="text-transform:capitalize;" class="selected-category">${category} </span>
                <span style="text-transform:capitalize;" class="selected-model">${item_details}</span>
                <span style="text-transform:capitalize;" class="selected-color">${item_color}</span>
                <span style="text-transform:capitalize;" class="selected-gb">${
                  item_gb.length > 0 ? item_gb + " GB" : ""
                }</span>
                ${
                  grade !== "-"
                    ? `<span style="text-transform:capitalize;" class="selected-grade">Grade ${grade}</span>`
                    : ""
                }  
                <span class="selected-supplier" style="font-weight:normal"> [${supplier}]</span>
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

// Redraw datatable
// $(".custom_datatable").hide();
const drawTableRow = function (rowsData, isFilterData) {
  summaryDataset = []; //renew summary before each search
  $(".custom_datatable").show();

  // tbody of searched data table
  let tbodySearchedData = document.getElementsByTagName("tbody")[1];

  // update total rows count
  $(".total_rows > span").html();

  // create row for each data
  if (isFilterData === FILTERDATA) {
    tbodySearchedData.innerHTML = "";
  }

  rowsData.forEach((val) => {
    let {
      purchase_id,
      item_imei,
      supplier_id,
      item_color,
      item_gb,
      item_grade,
      item_details,
      item_brand,
      status,
      purchase_return,
      location,
      // item_comments,
      // item_cosmetic_passed,
      // item_functional_passed,
    } = val;

    /* category */
    let category = "";
    if (val.item_brand && val.item_brand.length > 0) category = findBrand(item_brand);
    else category = "";

    /* supplier */
    let supplier = "";
    if (val.supplier_id && val.supplier_id.length > 0) {
      supplier = findSupplier(supplier_id);
    } else {
      supplier = "";
    }

    /* grade */
    let grade = "";
    if (
      parseInt(val.item_grade) > 0 &&
      parseInt(val.item_grade) <= grades.length
    ) {
      grade = grades.filter((item) => {
        return item.id === item_grade;
      })[0].title;
    } else {
      grade = "-";
    }

    // add to summary data
    summaryDataset.push({
      purchase_id,
      item_imei,
      category,
      supplier,
      item_color,
      item_gb,
      grade,
      item_details,
      purchase_return,
      status,
      location
    });

    if (isFilterData === FILTERDATA) {
      let trSearchedItems = document.createElement("tr");
      trSearchedItems.innerHTML = `<tr>
                <td>
                    ${purchase_id}
                </td>
                <td><a href="item_details.php?item_code=${item_imei}" target="_blank">${item_imei}</a></td>
                <td>
                    ${category}
                </td>
                <td>
                    ${supplier}
                </td>
                <td>
                    ${location || "Not Set"}
                </td>
                <td>
                    ${item_color}
                </td>
                <td>
                    ${item_gb ? (parseInt(item_gb, 10) >= 1024 ? (parseInt(item_gb, 10) / 1024) + ' TB' : item_gb + ' GB') : ''}
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
};

// Process data returned from the server
function processData(data) {
  let tableRows = '';
  let exportRows = '';
  
  data.forEach(item => {
    // Create displayed table row
    tableRows += `<tr>
      <td>${item.purchase_id}</td>
      <td>${item.item_imei}</td>
      <td>${item.item_brand}</td>
      <td>${item.supplier_name}</td>
      <td>${item.location || 'Not Set'}</td>
      <td>${item.item_color}</td>
      <td>${item.item_gb ? (parseInt(item.item_gb, 10) >= 1024 ? (parseInt(item.item_gb, 10) / 1024) + ' TB' : item.item_gb + ' GB') : ''}</td>
      <td>${item.item_grade}</td>
      <td>${item.item_details}</td>
      <td>${item.status}</td>
    </tr>`;
    
    // Create export table row
    exportRows += `<tr>
      <td><input type="hidden" name="pur_id[]" value="${item.purchase_id}">${item.purchase_id}</td>
      <td><input type="hidden" name="item_imei[]" value="${item.item_imei}">${item.item_imei}</td>
      <td><input type="hidden" name="item_brand[]" value="${item.item_brand}">${item.item_brand}</td>
      <td><input type="hidden" name="item_supplier[]" value="${item.supplier_name}">${item.supplier_name}</td>
      <td><input type="hidden" name="item_location[]" value="${item.location || ''}">${item.location || 'Not Set'}</td>
      <td><input type="hidden" name="item_color[]" value="${item.item_color}">${item.item_color}</td>
      <td><input type="hidden" name="item_gb[]" value="${item.item_gb}">${item.item_gb ? (parseInt(item.item_gb, 10) >= 1024 ? (parseInt(item.item_gb, 10) / 1024) + ' TB' : item.item_gb + ' GB') : ''}</td>
      <td><input type="hidden" name="item_grade[]" value="${item.item_grade}">${item.item_grade}</td>
      <td><input type="hidden" name="item_details[]" value="${item.item_details}">${item.item_details}</td>
      <td><input type="hidden" name="item_status[]" value="${item.status}">${item.status}</td>
    </tr>`;
  });
  
  $('.searched-table tbody').html(tableRows);
  $('.export-table tbody').html(exportRows);
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
    fetchData();
  });
}

//search imei
const searchIMEIBtn = D[QS](".search-datatable");
const searchIMEIInput = D[QS](".search-datatable-input");
searchIMEIBtn.onclick = function (e) {
  tableState.currentPage = 1;
  if (
    searchIMEIInput.value.length <= 16 &&
    searchIMEIInput.value.length >= 15
  ) {
    tableState.filterStatus = SEARCH_IMEI;
    tableState.searchIMEI = searchIMEIInput.value.trim();
    fetchData();
  } else {
    alert("Invalid item ID!!!!");
    tableState.currentPage = 1;
    tableState.filterStatus = SEARCH_FILTER;
    fetchData();
  }
};

//search model
const searchModel = D[QS](".search-model");
const searchModelInput = D[QS](".search-model-input");
searchModel.onclick = function (e) {
  e.preventDefault();
  filtersCalled();
};

// Filters
// Fetch In STOCK
const applyFilterBtn = document.getElementsByClassName("apply-filters")[0];
applyFilterBtn.addEventListener("click", function (e) {
  e.preventDefault();
  filtersCalled();
});

function filtersCalled() {
  tableState.currentPage = 1;

  // get current url before query
  let url = `${window.location.href.split("?")[0]}?`;

  let searchModelInput = D[QS](".search-model-input");
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

  // color filter
  let color = document.getElementsByClassName("select-color")[0].value;
  if (color.length <= 0) {
    color = null;
  }
  tableState.color = color;
  url = updateUrl(url, color, "COLOR", tableState.color);

  // grade filter
  let grade = document.getElementsByClassName("select-grade")[0].value;
  if (grade.length <= 0) {
    grade = null;
  }
  tableState.grade = grade;
  url = updateUrl(url, grade, "GRADE", tableState.grade);

  // gb filter
  let gb = document.getElementsByClassName("select-gb")[0].value;
  if (gb.length <= 0) {
    gb = null;
  }
  tableState.gb = gb;
  url = updateUrl(url, gb, "GB", tableState.gb);

  // IS QC COMPLETED filter
  let isQcDone = document.getElementsByClassName("select-qc-done")[0].value;
  if (isQcDone.length <= 0) {
    isQcDone = null;
  }
  tableState.isQcDone = isQcDone;
  // UPDATE URL
  url = updateUrl(url, isQcDone, "QC_DONE", tableState.isQcDone);

  // IS QC PASSED filter
  let isQcPassed = document.getElementsByClassName("select-qc-status")[0].value;
  if (isQcPassed.length <= 0) {
    isQcPassed = null;
  }
  tableState.isQcPassed = isQcPassed;
  // UPDATE URL
  url = updateUrl(url, isQcPassed, "QC_PASSED", tableState.isQcPassed);

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

// enable export
$(".exportexcel").on("click", function (e) {
  e.preventDefault();
  if (allDataLoaded) {
    generateExportData();
  }
});

/* 
----------
Generate Export file
-----------
 */
// disable export buttnon by default
function generateExportData() {
  if (tableState.exportData.length) {
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
showHideLoader();
function showHideLoader() {
  console.log("loading:", isLoading);
  if (isLoading) {
    isLoading = false;
    dataLoading.style.display = "none";
    return;
  }

  isLoading = true;
  dataLoading.style.display = "block";
}
