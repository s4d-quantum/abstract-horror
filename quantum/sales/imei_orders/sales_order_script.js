// Toggle supplier fetch categories
let D = document,
  supplier = D["querySelector"](".purchase_supplier"),
  categoryWrapper = D["querySelector"](".purchase_category"),
  colorWrapper = D["querySelector"](".purchase_color"),
  oemColorWrapper = D["querySelector"](".purchase_oem_color"),
  gbWrapper = D["querySelector"](".purchase_gb"),
  STATE = {
    suppliers: [],
    categories: [],
    colors: [],
    oemColors: [],
    grades: [],
    gb: [],
    filteredTable: D["querySelector"]("#filtered_table tbody"),
    selectedTable: D["querySelector"]("#selected_table tbody"),
    filteredArray: [],
    groupedFilteredArray: [],
    groupedSelectedArray: [],
    selectedArray: [],
    filters: {
      color: "",
      oemColor: "",
    },
  },
  loader = D["querySelector"](".loading-spinner");
$(".total-selected > span").html(STATE.selectedArray.length);

// Grade mapping
let gradeOptions = [];
for (let grade of $(".grade-field-copy").children()) {
  gradeOptions.push({
    value: grade.value,
    title: grade.innerHTML.trim(),
  });
}

// console.log($('.grade-field-copy').children()a)

loader.style.display = "none";
let filtered_table = $("#filtered_table").DataTable();

// toggle supplier
supplier.addEventListener("change", function (e) {
  loadSuppliers(this);
});
function loadSuppliers(that) {
  loader.style.display = "block";
  $.ajax({
    type: "POST",
    url: "includes/fetch_categories.php",
    data: {
      supplier: that.value,
    },
    success: (data) => {
      loader.style.display = "none";
      let d = JSON.parse(data);
      STATE.suppliers = [...d];
      drawCategories(d);
    },
    error: (data) => {
      loader.style.display = "none";
    },
  });
}

// toggle categories
categoryWrapper.addEventListener("change", function (e) {
  loadCategories(this);
});
function loadCategories(that) {
  loader.style.display = "block";
  $.ajax({
    type: "POST",
    url: "includes/fetch_model.php",
    data: {
      category: that.value,
    },
    success: (data) => {
      loader.style.display = "none";
      let d = JSON.parse(data);
      STATE.categories = [...d];
      fetchRowData();
    },
    error: (data) => {
      loader.style.display = "none";
    },
  });
}

// Draw categories/brands when toggle suppliers
function drawCategories(categories) {
  // show total generated categories
  let totalCatCount = D["querySelector"](".total-cat-count");
  totalCatCount.innerHTML = categories.length;

  categoryWrapper.innerHTML = `<option val="">Select</option>`;
  categories.forEach((category) => {
    let option = D["createElement"]("option");
    option.setAttribute("value", category.category_id);
    option.innerHTML = category.title;
    categoryWrapper.appendChild(option);
  });
}

// fetch data from for filtered array
function fetchRowData() {
  let supplier = D["querySelector"](".purchase_supplier").value,
    category = D["querySelector"](".purchase_category").value;
  STATE.filteredTable.innerHTML = "";

  $.ajax({
    type: "POST",
    url: "includes/fetch_row_data.php",
    data: {
      supplier,
      category,
    },
    success: (data) => {
      let d = JSON.parse(data);
      d = d.map((item) => ({
        item_brand: item.item_brand.trim(),
        item_grade: item.item_grade.trim(),
        item_color: item.item_color ? item.item_color.trim() : "",
        item_oem_color: item.oem_color ? item.oem_color.trim() : "",
        item_gb: item.item_gb.trim(),
        tray_id: item.tray_id.trim(),
        item_details: item.item_details.trim(),
        item_code: item.item_imei.trim(),
        supplier_id: item.supplier_id.trim(),
      }));
      STATE.colors = Array.from(
        new Set(d.map((item) => item.item_color).filter((val) => val.length))
      ).sort();
      STATE.oemColors = Array.from(
        new Set(d.map((item) => item.item_oem_color).filter((val) => val.length))
      ).sort();
      updateColorFilterLists();
      if (colorWrapper) {
        colorWrapper.value = "";
      }
      if (oemColorWrapper) {
        oemColorWrapper.value = "";
      }
      STATE.filters.color = "";
      STATE.filters.oemColor = "";
      drawRow(d);
    },
    error: (data) => {},
  });
}

function updateColorFilterLists() {
  const colorList = D.querySelector("#purchase-color-options");
  if (colorList) {
    colorList.innerHTML = STATE.colors
      .map((color) => `<option value="${color}"></option>`)
      .join("");
  }

  const oemColorList = D.querySelector("#purchase-oem-color-options");
  if (oemColorList) {
    oemColorList.innerHTML = STATE.oemColors
      .map((color) => `<option value="${color}"></option>`)
      .join("");
  }
}

if (colorWrapper) {
  colorWrapper.addEventListener("input", function () {
    STATE.filters.color = this.value.trim();
    drawFilteredTable();
  });
}

if (oemColorWrapper) {
  oemColorWrapper.addEventListener("input", function () {
    STATE.filters.oemColor = this.value.trim();
    drawFilteredTable();
  });
}

const clearColorFilterBtn = D.querySelector(".clear-color-filter");
if (clearColorFilterBtn) {
  clearColorFilterBtn.addEventListener("click", function () {
    STATE.filters.color = "";
    STATE.filters.oemColor = "";
    if (colorWrapper) colorWrapper.value = "";
    if (oemColorWrapper) oemColorWrapper.value = "";
    drawFilteredTable();
  });
}

function findGrade(gradeId = 0) {
  let selectedGrade = "";
  if (+gradeId > 0) {
    selectedGrade = gradeOptions.find((grade) => grade.value === gradeId).title;
  }
  return selectedGrade;
}

// draw data and populate on table
function drawRow(currentData) {
  STATE.filteredArray = [];
  STATE.groupedFilteredArray = [];
  STATE.filteredTable.innerHTML = ""; //clear all table data

  currentData.forEach((currentRow) => {
    let category = currentRow.item_brand,
      model = currentRow.item_details,
      gb = currentRow.item_gb,
      color = currentRow.item_color,
      oemColor = currentRow.item_oem_color,
      grade = currentRow.item_grade,
      tray_id = currentRow.tray_id,
      supplier = currentRow.supplier_id;

    // Confirm through groupedFilteredArray to see if same details are not already added before
    let alreadyAdded = false;
    for (let i = 0; i < STATE.groupedFilteredArray.length; i++) {
      if (
        category === STATE.groupedFilteredArray[i]["item_brand"] &&
        grade === STATE.groupedFilteredArray[i]["item_grade"] &&
        color === STATE.groupedFilteredArray[i]["item_color"] &&
        oemColor === STATE.groupedFilteredArray[i]["item_oem_color"] &&
        model === STATE.groupedFilteredArray[i]["item_details"] &&
        gb === STATE.groupedFilteredArray[i]["item_gb"] &&
        tray_id === STATE.groupedFilteredArray[i]["tray_id"] &&
        supplier === STATE.groupedFilteredArray[i]["supplier_id"]
      ) {
        alreadyAdded = true;
        break;
      }
    }

    // if same details not added before then add them
    if (!alreadyAdded) {
      // total count of similar details exists same as current item details
      let totalCurrent = currentData.filter((item) => {
        if (
          category === item["item_brand"] &&
          grade === item["item_grade"] &&
          color === item["item_color"] &&
          oemColor === item["item_oem_color"] &&
          model === item["item_details"] &&
          gb === item["item_gb"] &&
          tray_id === item["tray_id"] &&
          supplier === item["supplier_id"]
        ) {
          STATE.filteredArray.push({ ...item });
          return item;
        }
      });

      STATE.groupedFilteredArray.push({
        ...currentRow,
        item_qty: totalCurrent.length,
        isSelected: false,
      });
    }
  }); //foreach ended

  // draw filtered table
  drawFilteredTable();

  // console.log(STATE.filteredTable);
  Array.prototype.slice.call(STATE.filteredTable.children).map((item) => {});
}

// verify change of filtered items Qty to enable or disable add button
$(document).on("change, keyup", ".qtyinput", function (e) {
  let total = +this.dataset.total;
  let val = +this.value;
  let addBtn = this.parentElement.nextElementSibling.children[0];
  if (val > total || val < 1) {
    addBtn.setAttribute("disabled", "disabled");
  } else {
    addBtn.removeAttribute("disabled", "disabled");
  }
});

// fetch categories by category ID
let prevCachedId = -1;
var categories = [];
function fetchCategoryName(id) {
  // check if id is changed only then fetch from DOM otherwise use the prev one
  if (id !== prevCachedId || prevCachedId === -1) {
    categories = D["querySelectorAll"](".fetch_categories option");
  }

  let selected = "";
  categories.forEach((item) => {
    if (item.value === id) {
      selected = item.innerHTML;
    }
  });

  // update id to prevCachedId in order to avoid multiple DOM fetches above
  prevCachedId = id;
  return selected;
}

// fetch suppliers by supplier ID
let prevCachedSuppId = -1;
var suppliers = [];
function fetchSupplierName(id) {
  if (id !== prevCachedSuppId || prevCachedSuppId === -1) {
    suppliers = D["querySelectorAll"](".purchase_supplier option");
  }

  let selected = "";
  suppliers.forEach((item) => {
    if (item.value === id) {
      selected = item.innerHTML;
    }
  });

  // update id to prevCachedSuppId in order to avoid multiple DOM fetches above
  prevCachedSuppId = id;

  return selected;
}

// Add row event
$(document).on("click", ".add-item", function (e) {
  e.preventDefault();
  // add selected item in selectedArray
  let index = parseInt(this.dataset.index);
  let selectedItem = STATE.groupedFilteredArray[index];
  // pick qty of this clicking row
  let thisQty =
    this.parentElement.previousElementSibling.firstElementChild.value;

  // see if this item already added in selectedArray
  let isAlreadyInSelectedArray = STATE.selectedArray.filter((item) => {
    if (
      selectedItem.item_brand === item["item_brand"] &&
      selectedItem.item_grade === item["item_grade"] &&
      selectedItem.item_color === item["item_color"] &&
      selectedItem.item_oem_color === item["item_oem_color"] &&
      selectedItem.item_details === item["item_details"] &&
      selectedItem.item_gb === item["item_gb"] &&
      selectedItem.tray_id === item["tray_id"] &&
      selectedItem.supplier_id === item["supplier_id"]
    ) {
      return item;
    }
    return null;
  });
  if (isAlreadyInSelectedArray.length === 0) {
    // add all items of filteredarray to selectedArray then add to
    //  groupedselectedarray as well34.95.1.178
    // select items according to selected qty
    let qtyLimit = 0;
    STATE.filteredArray.forEach((filteredItem) => {
      if (
        selectedItem.item_brand === filteredItem["item_brand"] &&
        selectedItem.item_grade === filteredItem["item_grade"] &&
        selectedItem.item_color === filteredItem["item_color"] &&
        selectedItem.item_oem_color === filteredItem["item_oem_color"] &&
        selectedItem.item_details === filteredItem["item_details"] &&
        selectedItem.item_gb === filteredItem["item_gb"] &&
        selectedItem.tray_id === filteredItem["tray_id"] &&
        selectedItem.supplier_id === filteredItem["supplier_id"]
      ) {
        if (qtyLimit < thisQty) {
          STATE.selectedArray.push(filteredItem);
          qtyLimit++;
        }
      }
    });
  }

  // check if same item is already selected or not
  let isAlreadySelected = STATE.groupedSelectedArray.filter((item) => {
    if (
      item.item_brand === STATE.groupedFilteredArray[index]["item_brand"] &&
      item.item_grade === STATE.groupedFilteredArray[index]["item_grade"] &&
      item.item_color === STATE.groupedFilteredArray[index]["item_color"] &&
      item.item_oem_color === STATE.groupedFilteredArray[index]["item_oem_color"] &&
      item.item_details === STATE.groupedFilteredArray[index]["item_details"] &&
      item.item_gb === STATE.groupedFilteredArray[index]["item_gb"] &&
      item.tray_id === STATE.groupedFilteredArray[index]["tray_id"] &&
      item.supplier_id === STATE.groupedFilteredArray[index]["supplier_id"]
    ) {
      return item;
    }
    return null;
  });

  // only add in selectedArray if not already selected
  if (isAlreadySelected.length === 0) {
    STATE.groupedSelectedArray.push({
      ...selectedItem,
      item_qty: thisQty,
      isSelected: true,
    });
    drawSelectedTable();
  }

  // redraw filtered_table to highlighted selected items
  drawFilteredTable();

  // $("#selected_table").dataTable({
  //   "paginate": false
  // });
});

// Remove row event
$(document).on("click", ".remove-item", function (e) {
  e.preventDefault();
  let index = parseInt(this.dataset.index);
  let deletedItem = STATE.groupedSelectedArray[index];

  // delete item from groupselectedArray
  STATE.groupedSelectedArray = STATE.groupedSelectedArray.filter((item) => {
    if (
      item.item_brand === deletedItem["item_brand"] &&
      item.item_grade === deletedItem["item_grade"] &&
      item.item_color === deletedItem["item_color"] &&
      item.item_oem_color === deletedItem["item_oem_color"] &&
      item.item_details === deletedItem["item_details"] &&
      item.item_gb === deletedItem["item_gb"] &&
      item.tray_id === deletedItem["tray_id"] &&
      item.supplier_id === deletedItem["supplier_id"]
    ) {
      return null;
    }
    return item;
  });

  // delete all relevant items from selectedArray as well
  STATE.selectedArray = STATE.selectedArray.filter((item) => {
    if (
      item.item_brand === deletedItem["item_brand"] &&
      item.item_grade === deletedItem["item_grade"] &&
      item.item_color === deletedItem["item_color"] &&
      item.item_oem_color === deletedItem["item_oem_color"] &&
      item.item_details === deletedItem["item_details"] &&
      item.item_gb === deletedItem["item_gb"] &&
      item.tray_id === deletedItem["tray_id"] &&
      item.supplier_id === deletedItem["supplier_id"]
    ) {
      return null;
    }
    return item;
  });
  // STATE.selectedTable.deleteRow($(this.parentElement.parentElement).index());
  drawSelectedTable();
  // redraw filtered_table to unhighlight removed items
  drawFilteredTable();
});

$(".submit-btn").on("click", function (e) {
  e.preventDefault();
  // console.log("clicked");
  submitData(this);
});

// submit data
function submitData(that) {
  let item_brand = [],
    item_details = [],
    item_color = [],
    item_gb = [],
    item_grade = [],
    tray_id = [],
    item_code = [],
    supplier_id = [],
    purchase_customer = D["querySelector"](".purchase_customer").value,
    po_ref = D["querySelector"](".po_ref").value,
    customer_ref = D["querySelector"](".customer_ref").value,
    user_id = D["querySelector"](".user_id").value;

  STATE.selectedArray.map((item) => {
    item_code.push(item.item_code);
    item_details.push(item.item_details);
    item_brand.push(item.item_brand);
    item_color.push(item.item_color);
    item_gb.push(item.item_gb);
    item_grade.push(item.item_grade);
    tray_id.push(item.tray_id);
    supplier_id.push(item.supplier_id);
  });

  // confirm customer is selected
  if (!purchase_customer.length) {
    alert("Please select the Customer");
    return;
  }

  // confirm customer is selected
  else if (!tray_id.length) {
    alert("Not item selected");
    return;
  }
  console.log(STATE);

  // disable submit btn to prevent more clicks
  that.setAttribute("disabled", "disabled");

  $.ajax({
    type: "POST",
    url: "includes/submit_order.php",
    data: {
      customer: purchase_customer,
      customer_ref,
      po_ref,
      user_id,
      item_color,
      item_brand,
      item_details,
      item_gb,
      item_grade,
      tray_id,
      item_code,
      supplier: supplier_id,
    },
    success: (data) => {
      console.log(data);
      location.href = "manage_orders.php";
      $(this).removeAttr("disabled");
    },
    error: (data) => {
      console.log(data);
      $(this).removeAttr("disabled");
    },
  });
}
// submit data

function drawSelectedTable() {
  STATE.selectedTable.innerHTML = "";
  // need index to add in remove btn so we find out the last index and then calculated the current index
  STATE.groupedSelectedArray.map((selectedItem, index) => {
    let tr = `<tr>
      <td>
        ${fetchSupplierName(selectedItem.supplier_id)}
      </td>
      <td>
        ${fetchCategoryName(selectedItem.item_brand)}
      </td>
      <td>
        ${selectedItem.item_details}
      </td>
      <td>
        ${selectedItem.item_color}
      </td>
      <td>
        ${selectedItem.item_oem_color || ""}
      </td>
      <td>
        ${selectedItem.item_gb}
      </td>
      <td>
        ${findGrade(selectedItem.item_grade)}
      </td>
      <td>
        ${selectedItem.tray_id}
      </td>
      <td>
      ${selectedItem.item_qty}
      </td>
      <td><button class="remove-item btn btn-danger" data-index="${index}">X</button></td>
    </tr>
    `;
    STATE.selectedTable.innerHTML += tr;
  });
  $(".total-selected > span").html(STATE.selectedArray.length);
}

function matchesActiveFilters(item) {
  const colorFilter = STATE.filters.color.trim().toLowerCase();
  const oemColorFilter = STATE.filters.oemColor.trim().toLowerCase();
  const itemColor = (item.item_color || "").toLowerCase();
  const itemOemColor = (item.item_oem_color || "").toLowerCase();

  if (colorFilter.length && itemColor.indexOf(colorFilter) === -1) {
    return false;
  }

  if (oemColorFilter.length && itemOemColor.indexOf(oemColorFilter) === -1) {
    return false;
  }

  return true;
}

function drawFilteredTable() {
  filtered_table.destroy();
  console.log(STATE.groupedSelectedArray);
  STATE.filteredTable.innerHTML = "";

  /* 
    check if any item is already selected to selectedTable, if yes then mark isSelected:true 
    in order to highlight that row
  */

  STATE.groupedFilteredArray.forEach((filteredItem) => {
    let isAlreadySelected = STATE.groupedSelectedArray.find((selectedItem) => {
      return (
        filteredItem["item_brand"] === selectedItem["item_brand"] &&
        filteredItem["item_grade"] === selectedItem["item_grade"] &&
        filteredItem["item_color"] === selectedItem["item_color"] &&
        filteredItem["item_oem_color"] === selectedItem["item_oem_color"] &&
        filteredItem["item_details"] === selectedItem["item_details"] &&
        filteredItem["item_gb"] === selectedItem["item_gb"] &&
        filteredItem["tray_id"] === selectedItem["tray_id"] &&
        filteredItem["supplier_id"] === selectedItem["supplier_id"]
      );
    });
    filteredItem["isSelected"] = isAlreadySelected;
  });

  const filteredRows = STATE.groupedFilteredArray
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => matchesActiveFilters(item));

  filteredRows.forEach(({ item, index }) => {
    let tr = `<tr style="background-color:${
      item["isSelected"] ? "#b6e6d0" : "white"
    }">
        <td>${fetchCategoryName(
          item["item_brand"]
        )}</td>
        <td>${item["item_details"]}</td>
        <td>${item["item_color"]}</td>
        <td>${item["item_oem_color"] || ""}</td>
        <td>${item["item_gb"]}</td>
        <td>${findGrade(item["item_grade"])}</td>
        <td>${item["tray_id"]}</td>
        <td>
          <input type="number" min="1" class="form-control qtyinput" 
            data-total="${item["item_qty"]}" 
            max="${item["item_qty"]}" value="${
      item["item_qty"]
    }"/>
      <span class="hidden">${item["item_qty"]}</span>
      </td>
        <td><button ${
          item["isSelected"] ? "disabled" : ""
        } class="add-item btn btn-success" data-index="${index}">Add</button></td>
      </tr>
      `;

    $(tr).appendTo(STATE.filteredTable);
  });

  //for ended
  filtered_table = $("#filtered_table").DataTable({
    paging: false,
    stateSave: true,
  });
}
