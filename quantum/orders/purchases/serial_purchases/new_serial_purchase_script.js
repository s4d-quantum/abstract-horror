// Beep audio
let x = document.querySelector("#myAudio");

var selected_items = [];
var new_item_field = "",
  rowId = 2;

var $tbody = $("#purchase_items").find("tbody");

// Add new row
function addNewRow() {
  let categories = $(".brand-field").last().html(),
    grade_options = $(".grade-field").last().html(),
    trayOptions = $(".tray-field").last().html(),
    detail = $(".details-field").last().val();

  new_item_field += `<tr>
        <td class="row-id hidden">
        ${rowId}
        </td>
        <td>

        <div class='form-group'>
                <input type='text' class='item-code form-control' placeholder="Item code" name='item_code[]'>
                <span class='help-block imei-help-block'></span>
                <svg class="code727 code${rowId}"></svg>
            </div>
        </td>
        <td>
            <select class='brand-field form-control' 
            name='item_brand[]' required> ${categories} 
            </select>        
        </td>
        <td>
            <select class='grade-field form-control'
            name='item_grade[]'> 
            ${grade_options} 
            </select>        
        </td>
        <td>
            <input  class='details-field form-control' placeholder="Item details" 
            type='text' name='item_details[]' value="${detail}">
        </td>
        <td>
            <select name="item_tray[]"  class="tray-field form-control">
            ${trayOptions}
            </select>
        </td>
        <td>
            <button class="del_row btn btn-danger"><i class="fa fa-close"></i></button>  
            <label class="btn btn-success print_tag" 
                disabled="true">
                <i class="fa fa-print"></i>
            </label>
        </td>
    </tr>`;
  rowId++;

  $tbody.append(new_item_field);

  new_item_field = "";

  updateTotalItems();

  // assign focusout to imei box
  imeiFields = document.getElementsByClassName("item-code");
  imeiFields[imeiFields.length - 1].focus();

  $(".booking-completed").show();
  $(".submit-form").hide();
} //add new row ended

let table = $("#purchase_items");

function validateDetails() {
  let $that = $(this);

  // All input values, to check if same imei added twice
  let allInputValues = [...document.getElementsByClassName("item-code")].filter(
    (input) => {
      return input.value === this.value;
    }
  );

  // if same item codes are added twice
  if (allInputValues.length > 1) {
    $that
      .parent()
      .removeClass("has-success")
      .removeClass("has-warning")
      .addClass("has-error");
    $that.siblings(".help-block").html("Duplicate");
    $(".add_row").attr("disabled", "true");
    $("#submit_purchase").addClass("disabled");
    this.value = "";
    x.play(); //error beep
    return null;
  } else {
    $that
      .parent()
      .removeClass("has-success")
      .removeClass("has-warning")
      .removeClass("has-error");
    $that.siblings(".help-block").html("");
    $(".add_row").removeAttr("disabled");
    $("#submit_purchase").removeClass("disabled");

    // ===
    // DUPLICATE PREVIOUS ROW DATA
    // ===
    let tr = table.find("tr")[table.find("tr").length - 1],
      prevBrand = $(tr).find(".brand-field option:selected")[0],
      prevTray = $(tr).find(".tray-field option:selected")[0],
      prevGrade = $(tr).find(".grade-field option:selected")[0];

    // Item brand end
    $that
      .parent()
      .parent()
      .siblings()
      .children(".brand-field")
      .children()
      .each((i, option) => {
        if (option.value === prevBrand.value) {
          $(option).attr("selected", "selected");
        } else {
          $(option).removeAttr("selected");
        }
      });

    // Item grade end
    $that
      .parent()
      .parent()
      .siblings()
      .children(".grade-field")
      .children()
      .each((i, option) => {
        if (option.value === prevGrade.value) {
          $(option).attr("selected", "selected");
        } else {
          $(option).removeAttr("selected");
        }
      });

    // Item tray end
    $that
      .parent()
      .parent()
      .siblings()
      .children(".tray-field")
      .children()
      .each((i, option) => {
        if (option.value == prevTray.value) {
          $(option).attr("selected", "selected");
        } else {
          $(option).removeAttr("selected");
        }
      });

    // print button
    $that
      .parent()
      .parent()
      .siblings()
      .children(".print_tag")
      .removeAttr("disabled");
    return 1;
  }
}

// Barcode input on IMEI field
isCodeValidated = 0;
$(document).on("keypress", ".item-code", processKey);
function processKey(event) {
  if (event.keyCode === 13) {
    event.preventDefault();
    let na = validateDetails.call(this);
    isCodeValidated = 1;
    if (na) {
      addNewRow();
    }
  }
}

$(document).on("blur", ".item-code", function () {
  if (!isCodeValidated) {
    validateDetails.call(this);
  }
});

// disable enter key
$(document).keypress(function (event) {
  let isItemFocused = document.activeElement.className.indexOf("item-field"); //find if item field focused
  if (event.which == "13" && isItemFocused === -1) {
    event.preventDefault();
    // addNewRow();
  }
});

// add new row button
$(".add_row").on("click", function (e) {
  e.preventDefault();
  addNewRow();
});

$(document).ready(function () {
  $(".select2").select2();
});

// ==========
// Booking validtion
// ==========
// show/hide booking/submit button
$(".submit-form").hide();
$(".page-loader").hide();
$(".booking-completed").on("click", function (e) {
  e.preventDefault();
  $(".page-loader").show();

  // validate duplicate items
  let bookedItems = Array.prototype.slice
      .call(document.querySelectorAll(".item-code"))
      .map((item) => item.value),
    duplicateItems = [],
    validItems = false,
    bookingBtn = $(this);

  // check if same item added twice
  for (let i = 0; i < bookedItems.length; i++) {
    for (let j = bookedItems.length - 1; j > i; j--) {
      if (bookedItems[i] == bookedItems[j]) {
        duplicateItems.push(bookedItems[i]);
      }
    }
  }

  // if no no item added twice
  if (duplicateItems.length <= 0) {
    //now validate if no item already added in stock
    $.ajax({
      type: "POST",
      url: "includes/validate_serial.php",
      data: {
        items: {
          data: bookedItems,
        },
      },
      success: function (data) {
        // console.log(data)
        $(".page-loader").hide();
        data = JSON.parse(data);
        if (data.length > 0) {
          alert("Items already in Stock: " + [...data].join(", "));
          validItems = false;
          e.preventDefault();
        } else {
          // if items are all unique
          validItems = true;
          bookingBtn.hide();
          $(".submit-form").show();
        }
      },
    });
  } else {
    $(".page-loader").hide();
    alert("Duplciate values added: " + duplicateItems.join(", "));
  }
});

let formSubmittedCount = 1;
$(document).on("click", ".submit-form", function (e) {
  e.preventDefault();

  let inputsValidated = true; //default

  let purchaseDate = document.querySelector(".purchase_date").value;
  // check supplier
  let supplier = document.querySelector(".purchase_supplier").value;
  // check QC
  let qc = document.querySelector(".qc_required").value;
  let po_ref = document.querySelector(".po_ref").value;
  // check IMEIs
  let item_code = document.querySelectorAll(".item-code");
  let checkImei = Array.prototype.filter.call(
    item_code,
    (item) => item.value.length <= 0
  );
  // check brands
  let brand = document.querySelectorAll(".brand-field");
  let checkbrand = Array.prototype.filter.call(
    brand,
    (item) => item.value.length <= 0
  );

  let details_field = document.querySelectorAll(".details-field"),
    grade_field = document.querySelectorAll(".grade-field"),
    tray = document.querySelectorAll(".tray-field"),
    user_id = document.querySelector(".user_id").value;

  details_field = Array.prototype.map.call(details_field, (item) => item.value);
  grade_field = Array.prototype.map.call(grade_field, (item) => item.value);
  item_code = Array.prototype.map.call(item_code, (item) => item.value.trim());
  brand_field = Array.prototype.map.call(brand, (item) => item.value);
  tray = Array.prototype.map.call(tray, (item) => item.value);

  // check supplier
  if (supplier.length <= 0) {
    inputsValidated = false;
    alert("supplier is missing!");
  }

  // check QC
  else if (qc.length <= 0) {
    inputsValidated = false;
    alert("QC requied or not?");
  }

  // check IMEIs
  else if (checkImei.length > 0) {
    inputsValidated = false;
    alert("Item Code missing!");
  }

  // check brands
  else if (checkbrand.length > 0) {
    inputsValidated = false;
    alert("brand missing");
  }

  if (inputsValidated && formSubmittedCount == 1) {
    formSubmittedCount++;
    $(this).attr("disabled", "disabled");
    $(this).val("Submitting..");

    $.ajax({
      type: "POST",
      url: "includes/submit_new_purchase.php",
      data: {
        purchase_date: purchaseDate,
        po_ref,        
        tray_id: tray,
        item_code,
        purchase_supplier: supplier,
        qc_required: qc,
        brand_field,
        details_field,
        grade_field,
        user_id,
      },
      success: function (data) {
        let D = JSON.parse(data);
        location.href = "serial_purchase_details.php?pur_id=" + D;
        $(this).removeAttr("disabled");
      },
      error: function (data) {
        $(this).removeAttr("disabled");
      },
    });
  } else if (!inputsValidated || formSubmittedCount > 1) {
    console.log(`Form submitted ${formSubmittedCount} times!`);
  }
});
// ==========
// Booking validtion
// ==========

// remove row
$(document).on("click", ".del_row", function (e) {
  e.preventDefault();
  $(this).parent().parent().remove();
  if ($(".has-error").length < 1) {
    $(".add_row").removeAttr("disabled");
    $(".submit-form").removeClass("disabled");
  }
  updateTotalItems();
});

/** Print tag **/
// *****
$(document).on("click", ".print_tag", function (e) {
  e.preventDefault();
  printTag(this);
});

function printTag(that) {
  let imei = $(that).parent().parent().children().find(".item-code").val(),
    details = $(that).parent().parent().children().find(".details-field").val(),
    rowId = $(that).parent().parent().find(".row-id").html().trim();

  // create SVG
  JsBarcode(`.code${rowId}`, imei);
  let barcode = document.querySelector(`.code${rowId}`).outerHTML;

  let brand = null;
  $(that)
    .parent()
    .parent()
    .children()
    .find(".brand-field")
    .children()
    .filter((i, item) => {
      if (item.selected) {
        brand = item.innerHTML;
      }
    });

  var printContent = `
        <div class="item_imei_code">
          <p class="text-center show-on-print">
            ${brand} ${details} 
            ${barcode}
          </p>
        </div>
      `;
  var tagContainer = document.querySelector(".tag-container");
  tagContainer.innerHTML = printContent;
  // document.body.innerHTML = tagContainer.outerHTML;
  window.print();
  tagContainer.innerHTML = "";
}

// Barcode size for print
[...document.querySelectorAll(".code727")].map(function (item) {
  item.style.height = "60px";
});
// *****
/** /Print tag **/

// calculate total items
function updateTotalItems() {
  let t = $(".item-code").length;
  $(".total_items").html(t);
}
