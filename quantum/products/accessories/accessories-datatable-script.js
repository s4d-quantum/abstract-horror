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
let SEARCH_IMEI = "SEARCH_IMEI",
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
  tray: urlParams.get("TRAY") || null,
  fromDate: urlParams.get("FROMDATE") || null,
  toDate: urlParams.get("TODATE") || null,

  filterStatus: null, //SEARCH_MODEL,SEARCH_IMEI, SEARCH_FILTER
  searchItemCode: null,
  exportData: [],
};
let summaryDataset = [];

// set tablestate.filterStatus to FILTERDATA if there is any query in url
const { customer, supplier, category, tray, fromDate, toDate, stockType } =
  tableState;
if (
  customer ||
  supplier ||
  category ||
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

// Find/Search customer
let custOptions = Array.prototype.slice.call(
  document.querySelectorAll(".select-customer option")
);
function findCustomer(customerId) {
  let selectedCustomer = "";
  if (customerId) {
    // fetch customers
    selectedCustomer = customerOptions.find(
      (option) => (option) => option.value === customerId
    ).textContent;
  }
  return selectedCustomer;
}

// fetch total data rows
function totalDataPages() {
  let { filterStatus, searchMODEL, searchItemCode } = tableState;
  if (filterStatus === SEARCH_FILTER || filterStatus === SEARCH_MODEL) {
    const {
      customer,
      supplier,
      category,
      tray,
      fromDate,
      toDate,
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
  } else if (filterStatus === SEARCH_IMEI) {
    // console.log('inside')
    $.ajax({
      type: "GET",
      url: "includes/fetch-total-data-rows.php",
      data: {
        searchItemCode,
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
  dataLoading.style.display = "block";
  const {
    customer,
    supplier,
    category,
    tray,
    fromDate,
    toDate,
    stockType,
    currentPage,
    filterStatus,
    searchItemCode,
  } = tableState;

  // Search IMEI
  if (filterStatus === SEARCH_IMEI) {
    $(".view-summary-btn").hide();
    $.ajax({
      type: "POST",
      url: "includes/fetch-accessories-data.php",
      data: {
        stockType,
        searchItemCode,
      },
      success: function (data) {
        data = JSON.parse(data);
        let rowsData = data.data;
        dataLoading.style.display = "none";

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
      error: function () {
        dataLoading.style.display = "none";
      },
    }); //ajax done
  }
  // Apply Filter and pagination
  else if (filterStatus === SEARCH_FILTER || filterStatus === SEARCH_MODEL) {
    // console.log(SEARCH_FILTER);
    document.querySelector(".current-page-btn > b > span").innerHTML =
      currentPage;

    $.ajax({
      type: "POST",
      url: "includes/fetch-accessories-data.php",
      data: {
        customer,
        supplier,
        category,
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
        dataLoading.style.display = "none";

        if (rowsData.length) {
          $(".no-data-error").html("");
          $(".table").show();
          drawTableRow(rowsData, FILTERDATA);
        } else {
          $(".no-data-error").html("No data to show..");
          $(".table").hide();
        }
      },
      error: function () {
        dataLoading.style.display = "none";
      },
    }); //ajax ended

    // summary table data
    $.ajax({
      type: "POST",
      url: "includes/fetch_inventory_export_data.php",
      data: {
        customer,
        supplier,
        category,
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

        $(".view-summary-btn").show();
        dataLoading.style.display = "none";

        // save data for export
        // replace supplier id with supplier name in whole rows before exporting
        let mappedData = rowsData.map((row) => ({
          "Product#": row.item_code,
          Title: row.product_title,
          "Goodsin#": row.purchase_id,
          "Goodsin Qty": row.purchase_qty,
          Supplier: findSupplier(row.supplier_id) || "-",
          Brand: findBrand(row.item_brand) || "-",
          Customer: findCustomer(row.customer_id) || "-",
          "Current Qty": parseInt(row.item_qty),
        }));

        // export now
        tableState.exportData = [...mappedData];

        if (rowsData.length) {
          drawTableRow(rowsData);
          /* draw summary table */
          drawSummaryData();
        }
      },
      error: function () {
        dataLoading.style.display = "block";
      },
    }); //ajax ended
    // export table data
  } //else ended
} //fetchdata ended

// run fetch data on page reload based on search query values
fetchData();

// Redraw datatable
$(".custom_datatable").hide();
const drawTableRow = function (rowsData, isFilterData) {
  summaryDataset = []; //renew summary before each search
  $(".custom_datatable").show();

  // tbody of searched data table
  let tbodySearchedData = document.getElementsByTagName("tbody")[1];

  // update total rows count
  $(".total_rows > span").html();

  // // create row for each data
  if (isFilterData === FILTERDATA) {
    tbodySearchedData.innerHTML = "";
  }

  rowsData.forEach((val) => {
    let { item_code, product_title, item_qty, item_brand } = val;

    /* category */
    let category = "";
    if (val?.item_brand?.length > 0) category = findBrand(item_brand);
    else category = "";

    // add to summary data
    summaryDataset.push({
      item_code,
      product_title,
      category,
      item_qty,
    });

    if (isFilterData === FILTERDATA) {
      let trSearchedItems = document.createElement("tr");
      trSearchedItems.innerHTML = `<tr>
        <td>
            <a href="item_details.php?item_code=${item_code}" target="_blank">${product_title}</a></td>
        </td>
        <td>
            ${category}
        </td>
        <td>
            ${item_qty}
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
    fetchData();
  });
}

//search imei
const searchItemCodeBtn = document.querySelector(".search-datatable");
const searchItemCodeInput = document.querySelector(".search-datatable-input");
searchItemCodeBtn.onclick = function (e) {
  tableState.currentPage = 1;
  if (searchItemCodeInput.value.trim().length > 0) {
    tableState.filterStatus = SEARCH_IMEI;
    tableState.searchItemCode = searchItemCodeInput.value.trim();
    fetchData();
  } else {
    alert("Invalid item ID!!!!");
    tableState.currentPage = 1;
    tableState.filterStatus = SEARCH_FILTER;
    fetchData();
  }
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
  let D = document;
  // add unique details
  let selectedArray = [];

  // empty tbody on each filter button clicked
  $(".summary-table tbody").html("");

  // Group requiredItems and calculate total count
  selectedArray = _.groupBy(summaryDataset, (item) => {
    return `${
      item.category.split(" ").join("") +
      item.item_code.split(" ").join("") +
      item.product_title.split(" ").join("")
    }`;
  });
  selectedArray = _.toArray(selectedArray).map((group) => ({
    ...group[0],
    total: group.length,
  }));

  // draw summary rows:
  selectedArray.forEach((item) => {
    let { category, product_title, total, item_qty } = item;
    let tr = `<tr>
            <td colspan="4"><b>
                <span style="text-transform:capitalize;" class="selected-category">${category} </span>
                <span style="text-transform:capitalize;" class="selected-model">${product_title}</span>
            </td>`;

    tr +=
      parseInt(item_qty) > 0
        ? `<td class="total-summary-count" style="font-weight:bold;">
                Total: ${item_qty}
            </td>`
        : `<td class="total-summary-count" style="color:red; font-weight:bold;">
                Total: ${item_qty}
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
// disable export buttnon by default
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
