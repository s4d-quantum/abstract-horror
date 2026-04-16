// Toggle supplier fetch categories
let D = document;
let purchase_id = D["querySelector"](".purchase_id").value;
let item_code = D["querySelector"](".item_code").value;
let user_id = D["querySelector"](".user_id").value;
let categoryWrapper = D["querySelector"](".fetch_categories");
let STATE = {
  filteredTable: D["querySelector"]("#filtered_table tbody"),
  selectedTable: D["querySelector"]("#selected_table tbody"),
  filteredArray: [],
  groupedFilteredArray: [],
  groupedSelectedArray: [],
  selectedArray: [],
};
let loader = D["querySelector"](".loading-spinner");
$(".total-selected > span").html(STATE.selectedArray.length);

// EDIT ORDER ID
let filtered_table = $("#filtered_table").DataTable({
  paging: false,
});

// Grade mapping
let gradeOptions = [];
for (let grade of $(".grade-field-copy").children()) {
  gradeOptions.push({
    value: grade.value,
    title: grade.innerHTML.trim(),
  });
}

loader.style.display = "none";

// fetch data from backend
function fetchRowData() {
  loader.style.display = "block";

  STATE.filteredTable.innerHTML = "";

  $.ajax({
    type: "POST",
    url: "includes/fetch_row_data.php",
    data: {
      item_code,
    },
    success: (data) => {
      loader.style.display = "none";
      let d = JSON.parse(data);
      // console.log(d);
      d = d.map((item) => ({
        part_brand: item.item_brand,
        part_id: item.id.trim(),
        part_title: item.title.trim(),
        part_color: item.item_color ? item.item_color.trim() : "",
        item_qty: +item.item_qty,
      }));
      drawRow(d);
    },
    error: (data) => {
      loader.style.display = "none";
    },
  });
}

// draw data and populate on table
function drawRow(currentData) {
  STATE.filteredArray = [];
  STATE.groupedFilteredArray = [];
  STATE.filteredTable.innerHTML = ""; //clear all table data

  currentData.forEach((currentRow) => {
    STATE.filteredArray.push({ ...currentRow });
    STATE.groupedFilteredArray.push({
      ...currentRow,
      isSelected: false,
    });
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

// Add row event
$(document).on("click", ".add-item", function (e) {
  e.preventDefault();
  // add selected item in selectedArray
  let index = parseInt(this.dataset.index);
  let selectedItem = STATE.groupedFilteredArray[index];
  // pick qty of this clicking row
  let thisQty =
    +this.parentElement.previousElementSibling.firstElementChild.value;

  // see if this item already added in selectedArray
  let isAlreadyInSelectedArray = STATE.selectedArray.filter((item) => {
    if (
      selectedItem.part_brand === item["part_brand"] &&
      selectedItem.part_color === item["part_color"] &&
      selectedItem.part_id === item["part_id"] &&
      selectedItem.part_title === item["part_title"]
    ) {
      return item;
    }
    return null;
  });
  if (isAlreadyInSelectedArray.length === 0) {
    // add all items of filteredarray to selectedArray then add to
    //  groupedselectedarray as well
    // select items according to selected qty
    let qtyLimit = 0;
    STATE.filteredArray.forEach((filteredItem) => {
      if (
        selectedItem.part_brand === filteredItem["part_brand"] &&
        selectedItem.part_color === filteredItem["part_color"] &&
        selectedItem.part_id === filteredItem["part_id"] &&
        selectedItem.part_title === filteredItem["part_title"]
      ) {
        if (qtyLimit < thisQty) {
          STATE.selectedArray.push({
            part_id: filteredItem.part_id,
            part_brand: filteredItem.part_brand,
            part_title: filteredItem.part_title,
            item_qty: thisQty,
          });
          qtyLimit++;
        }
      }
    });
  }

  // check if same item is already selected or not
  let isAlreadySelected = STATE.groupedSelectedArray.filter((item) => {
    if (
      item.part_brand === STATE.groupedFilteredArray[index]["part_brand"] &&
      item.part_color === STATE.groupedFilteredArray[index]["part_color"] &&
      item.part_title === STATE.groupedFilteredArray[index]["part_title"] &&
      item.part_id === STATE.groupedFilteredArray[index]["part_id"]
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

  console.log(STATE.selectedArray);
});

// Remove row event
$(document).on("click", ".remove-item", function (e) {
  e.preventDefault();
  let index = parseInt(this.dataset.index);
  let deletedItem = STATE.groupedSelectedArray[index];

  // delete item from groupselectedArray
  STATE.groupedSelectedArray = STATE.groupedSelectedArray.filter((item) => {
    if (
      item.part_brand === deletedItem["part_brand"] &&
      item.part_color === deletedItem["part_color"] &&
      item.part_title === deletedItem["part_title"] &&
      item.part_id === deletedItem["part_id"]
    ) {
      return null;
    }
    return item;
  });

  // delete all relevant items from selectedArray as well
  STATE.selectedArray = STATE.selectedArray.filter((item) => {
    if (
      item.part_brand === deletedItem["part_brand"] &&
      item.part_color === deletedItem["part_color"] &&
      item.part_id === deletedItem["part_id"] &&
      item.part_title === deletedItem["part_title"]
    ) {
      return null;
    }
    return item;
  });

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
  let part_id = [];
  let part_qty = [];

  STATE.groupedSelectedArray.map((item) => {
    part_id.push(item.part_id);
    part_qty.push(item.item_qty);
  });

  // disable submit btn to prevent more clicks
  that.setAttribute("disabled", "disabled");

  $.ajax({
    type: "POST",
    url: "includes/submit_edit_repair_parts.php",
    data: {
      purchase_id,
      part_id,
      part_qty,
      item_code,
      user_id,
    },
    success: (data) => {
      console.log(data);
      location.href = `../edit_repair.php?pur_id=${purchase_id}`;
      $(this).removeAttr("disabled");
    },
    error: (data) => {
      console.log(data);
      $(this).removeAttr("disabled");
    },
  });
}

function fetchInitialData() {
  $.ajax({
    type: "POST",
    url: "includes/fetch_edit_data.php",
    data: {
      purchase_id,
      item_code,
    },
    success: (data) => {
      let d = JSON.parse(data);
      // fill selected and groupedselected array when page load
      fillGroupedSelectedArray(d);
      fetchRowData();
    },
    error: (data) => {
      console.log(data);
    },
  });
}

// create SelectedGroupArray
function fillGroupedSelectedArray(data) {
  data.map((content) => {
    let t = {
      part_brand: content.part_brand.trim(),
      part_id: content.part_id.trim(),
      part_title: content.part_title.trim(),
      part_color: content.item_color ? content.item_color.trim() : "",
      item_qty: content.item_qty,
      item_code: content.item_code,
    };
    STATE.selectedArray.push({ ...t });
    STATE.groupedSelectedArray.push({ ...t });
    STATE.filteredArray.push({ ...t });
    STATE.groupedFilteredArray.push({ ...t, isSelected: true });
  });

  console.log(STATE.groupedSelectedArray);
  console.log(STATE.selectedArray);
  drawSelectedTable();
}

// fetch all order items on page load
$(document).ready(function () {
  fetchInitialData();
});

function drawSelectedTable() {
  STATE.selectedTable.innerHTML = "";
  // need index to add in remove btn so we find out the last index and then calculated the current index
  STATE.groupedSelectedArray.map((selectedItem, index) => {
    let tr = `<tr>
      <td>
        ${selectedItem.part_title}
      </td>
      <td>
        ${fetchCategoryName(selectedItem.part_brand)}
      </td>
      <td>${selectedItem.part_color}</td>
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
  STATE.filteredTable.innerHTML = "";

  /* 
    check if any item is already selected to selectedTable, if yes then mark isSelected:true 
    in order to highlight that row
  */

  STATE.groupedFilteredArray.forEach((filteredItem) => {
    let isAlreadySelected = STATE.groupedSelectedArray.find((selectedItem) => {
      return (
        filteredItem["part_brand"] === selectedItem["part_brand"] &&
        filteredItem["part_color"] === selectedItem["part_color"] &&
        filteredItem["part_title"] === selectedItem["part_title"] &&
        filteredItem["part_id"] === selectedItem["part_id"]
      );
    });
    filteredItem["isSelected"] = isAlreadySelected;
  });

  // Draw each row from filteredArray
  for (let i = 0; i < STATE.groupedFilteredArray.length; i++) {
    let tr = `<tr style="background-color:${
      STATE.groupedFilteredArray[i]["isSelected"] ? "#b6e6d0" : "white"
    }">
        <td>${STATE.groupedFilteredArray[i]["part_title"]}</td>
        <td>${fetchCategoryName(
          STATE.groupedFilteredArray[i]["part_brand"]
        )}</td>
        <td>${STATE.groupedFilteredArray[i]["part_color"]}</td>

        <td>
          <input type="number" min="1" class="form-control qtyinput" 
            data-total="${STATE.groupedFilteredArray[i]["item_qty"]}" 
            max="${
              STATE.groupedFilteredArray[i]["item_qty"]
            }" value="${1}" title="max: ${
      STATE.groupedFilteredArray[i]["item_qty"]
    }"/>
          <span class="hidden">${
            STATE.groupedFilteredArray[i]["item_qty"]
          }</span>
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
