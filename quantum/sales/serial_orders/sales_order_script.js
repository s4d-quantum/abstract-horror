// Toggle supplier fetch categories
let D = document,
  supplier = D["querySelector"](".purchase_supplier"),
  categoryWrapper = D["querySelector"](".purchase_category"),
  colorWrapper = D["querySelector"](".purchase_color"),
  gbWrapper = D["querySelector"](".purchase_gb"),
  STATE = {
    suppliers: [],
    categories: [],
    grades: [],
    filteredTable: D["querySelector"]("#filtered_table tbody"),
    selectedTable: D["querySelector"]("#selected_table tbody"),
    filteredArray: [],
    groupedFilteredArray: [],
    groupedSelectedArray: [],
    selectedArray: [],
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
        tray_id: item.tray_id.trim(),
        item_details: item.item_details.trim(),
        item_code: item.item_code.trim(),
        supplier_id: item.supplier_id.trim(),
      }));
      drawRow(d);
    },
    error: (data) => {},
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
      grade = currentRow.item_grade,
      tray_id = currentRow.tray_id,
      supplier = currentRow.supplier_id;

    // Confirm through groupedFilteredArray to see if same details are not already added before
    let alreadyAdded = false;
    for (let i = 0; i < STATE.groupedFilteredArray.length; i++) {
      if (
        category === STATE.groupedFilteredArray[i]["item_brand"] &&
        grade === STATE.groupedFilteredArray[i]["item_grade"] &&
        model === STATE.groupedFilteredArray[i]["item_details"] &&
        tray_id === STATE.groupedFilteredArray[i]["tray_id"] &&
        supplier === STATE.groupedFilteredArray[i]["supplier_id"]
      ) {
        alreadyAdded = true;
        break;
      }
    }

    // if same details added before then add them
    if (!alreadyAdded) {
      // total count of similar details exists same as current item details
      let totalCurrent = currentData.filter((item) => {
        if (
          category === item["item_brand"] &&
          grade === item["item_grade"] &&
          model === item["item_details"] &&
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
function fetchCategoryName(id) {
  let categories = D["querySelectorAll"](".fetch_categories option");
  let selected = "";
  categories.forEach((item) => {
    if (item.value === id) {
      selected = item.innerHTML;
    }
  });
  return selected;
}

// fetch suppliers by supplier ID
function fetchSupplierName(id) {
  let suppliers = D["querySelectorAll"](".purchase_supplier option");
  let selected = "";
  suppliers.forEach((item) => {
    if (item.value === id) {
      selected = item.innerHTML;
    }
  });
  return selected;
}

// Add row event
$(document).on("click", ".add-item", function (e) {
  e.preventDefault();
  // add selected item in selectedArray
  let index = parseInt(this.dataset.index);
  let selectedItem = STATE.groupedFilteredArray[index];
  // pick qty of this clicking row
  let thisQty = this.parentElement.previousElementSibling.firstElementChild
    .value;

  // see if this item already added in selectedArray
  let isAlreadyInSelectedArray = STATE.selectedArray.filter((item) => {
    if (
      selectedItem.item_brand === item["item_brand"] &&
      selectedItem.item_grade === item["item_grade"] &&
      selectedItem.item_details === item["item_details"] &&
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
        selectedItem.item_details === filteredItem["item_details"] &&
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
      item.item_details === STATE.groupedFilteredArray[index]["item_details"] &&
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
      item.item_details === deletedItem["item_details"] &&
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
      item.item_details === deletedItem["item_details"] &&
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
    item_grade = [],
    tray_id = [],
    item_code = [],
    supplier_id = [],
    purchase_customer = D["querySelector"](".purchase_customer").value,
    po_ref = D["querySelector"](".po_ref").value,
    user_id = D["querySelector"](".user_id").value;

  STATE.selectedArray.map((item) => {
    item_code.push(item.item_code);
    item_details.push(item.item_details);
    item_brand.push(item.item_brand);
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
      po_ref,
      user_id,
      item_brand,
      item_details,
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
        filteredItem["item_details"] === selectedItem["item_details"] &&
        filteredItem["tray_id"] === selectedItem["tray_id"] &&
        filteredItem["supplier_id"] === selectedItem["supplier_id"]
      );
    });
    filteredItem["isSelected"] = isAlreadySelected;
  });

  // Draw each row from filteredArray
  for (let i = 0; i < STATE.groupedFilteredArray.length; i++) {
    let tr = `<tr style="background-color:${
      STATE.groupedFilteredArray[i]["isSelected"] ? "#b6e6d0" : "white"
    }">
        <td>${fetchCategoryName(
          STATE.groupedFilteredArray[i]["item_brand"]
        )}</td>
        <td>${STATE.groupedFilteredArray[i]["item_details"]}</td>
        <td>${findGrade(STATE.groupedFilteredArray[i]["item_grade"])}</td>
        <td>${STATE.groupedFilteredArray[i]["tray_id"]}</td>
        <td>
          <input type="number" min="1" class="form-control qtyinput" 
            data-total="${STATE.groupedFilteredArray[i]["item_qty"]}" 
            max="${STATE.groupedFilteredArray[i]["item_qty"]}" value="${
      STATE.groupedFilteredArray[i]["item_qty"]
    }"/>
      <span class="hidden">${STATE.groupedFilteredArray[i]["item_qty"]}</span>
      </td>
        <td><button ${
          STATE.groupedFilteredArray[i]["isSelected"] ? "disabled" : ""
        } class="add-item btn btn-success" data-index="${i}">Add</button></td>
      </tr>
      `;
    STATE.filteredTable.innerHTML += tr;
  }

  //for ended
  filtered_table = $("#filtered_table").DataTable({
    paging: false,
    stateSave: true,
  });
}
