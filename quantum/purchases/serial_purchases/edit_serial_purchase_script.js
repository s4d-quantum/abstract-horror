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
    tray_options = $(".tray-field").last().html(),
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
            <select class='brand-field form-control' required 
            name='item_brand[]'> ${categories} </select>        
        </td>

        <td>
            <select class='grade-field form-control'
            name='item_grade[]'> ${grade_options} </select>        
        </td>

        <td><input  class='details-field form-control' placeholder="Item details" 
        type='text' name='item_details[]' value="${detail}"></td>

        <td>
            <select class='tray-field form-control'
            name='item_tray[]'> ${tray_options} </select>        
        </td>

        <td>
           <button class="del_row btn btn-danger"><i class="fa fa-close"></i></button>  

            <input type = "number"
            name = "purchase_return[]"
            class = "hidden purchase_return"
            value = "0" >
            
            <input type = "number"
            name = "status[]"
            class = "hidden status"
            value = "1" >

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
// disable btn by default
function validateDetails() {
  // All input values, to check if same imei added twice
  let allInputValues = [...document.getElementsByClassName("item-code")].filter(
    (input) => {
      return input.value === this.value;
    }
  );

  // if same item codes are added twice
  if (allInputValues.length > 1) {
    console.log("if");
    $(this)
      .parent()
      .removeClass("has-success")
      .removeClass("has-warning")
      .addClass("has-error");
    $(this).siblings(".help-block").html("Duplicate");
    $(".add_row").attr("disabled", "true");
    $("#submit_purchase").addClass("disabled");
    this.value = "";
    x.play(); //error beep
    return null;
  } else {
    console.log("else");
    $(this)
      .parent()
      .removeClass("has-success")
      .removeClass("has-warning")
      .removeClass("has-error");
    $(this).siblings(".help-block").html("");
    $(".add_row").removeAttr("disabled");
    $("#submit_purchase").removeClass("disabled");

    // ===
    // DUPLICATE PREVIOUS ROW DATA
    // ===
    let tr = table.find("tr")[table.find("tr").length - 2],
      prevBrand = $(tr).find(".brand-field option:selected")[0];
    prevTray = $(tr).find(".tray-field option:selected")[0];

    // Item brand end
    $(this)
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

    // Item Tray end
    $(this)
      .parent()
      .parent()
      .siblings()
      .children(".tray-field")
      .children()
      .each((i, option) => {
        if (option.value === prevTray.value) {
          $(option).attr("selected", "selected");
        } else {
          $(option).removeAttr("selected");
        }
      });

    // print button
    $(this)
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
    console.log("enter");
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
    console.log("enter doc");
    event.preventDefault();
    // addNewRow();
  }
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
    $that = $(this);

  // only test items newly added and not those added in new purchase
  let fetchOld = document.querySelectorAll(".fetch-old-items > li");
  for (let i = 0; i < fetchOld.length; i++) {
    for (let t = 0; t < bookedItems.length; t++) {
      // if bookeditem contains old item then remove it and don't validate it
      if (fetchOld[i].innerHTML.trim() === bookedItems[t].trim()) {
        bookedItems.splice(t, 1);
      }
    }
  }

  // if there are new items
  if (bookedItems.length > 0) {
    $.ajax({
      type: "POST",
      url: "includes/validate_serial.php",
      data: {
        items: {
          data: bookedItems,
        },
      },
      success: function (data) {
        $(".page-loader").hide();
        data = JSON.parse(data);

        if (data.length > 0) {
          alert("Items already in Stock: " + [...data].join(", "));
          validItems = false;
          e.preventDefault();
        } else {
          // if items are all unique
          validItems = true;
          $that.hide();
          $(".submit-form").show();
        }
      },
    });
  } else {
    $that.hide();
    $(".page-loader").hide();
    $(".submit-form").show();
  }
});

let formSubmittedCount = 1;
$(document).on("click", ".submit-form", function (e) {
  e.preventDefault();
  let inputsValidated = true; //default

  let PID = document.querySelector(".purchase_id").value;
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
    user_id = document.querySelector(".user_id").value,
    purchase_id = document.querySelector(".purchase_id").value,
    brand_field = document.querySelectorAll(".brand-field"),
    purchase_return = document.querySelectorAll(".purchase_return"),
    tray = document.querySelectorAll(".tray-field"),
    status = document.querySelectorAll(".status");

  details_field = Array.prototype.map.call(details_field, (item) => item.value);
  grade_field = Array.prototype.map.call(grade_field, (item) => item.value);
  item_code = Array.prototype.map.call(item_code, (item) => item.value.trim());
  brand_field = Array.prototype.map.call(brand_field, (item) => item.value);
  purchase_return = Array.prototype.map.call(
    purchase_return,
    (item) => item.value
  );
  status = Array.prototype.map.call(status, (item) => item.value);
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
      url: "includes/submit_edit_purchase.php",
      data: {
        purchase_date: purchaseDate,
        purchase_supplier: supplier,
        po_ref,
        purchase_id,
        tray_id: tray,
        purchase_return,
        qc_required: qc,
        item_code,
        item_brand: brand_field,
        item_details: details_field,
        item_grade: grade_field,
        user_id,
        status,
      },
      success: function (data) {
        console.log(data);
        let D = JSON.parse(data);
        location.href = "serial_purchase_details.php?pur_id=" + D;
        $(this).removeAttr("disabled");
      },
      error: function (data) {
        $(this).removeAttr("disabled");
        console.log(data);
      },
    });
  } else if (!inputsValidated || formSubmittedCount > 1) {
    console.log(`Form submitted ${formSubmittedCount} times!`);
  }
});
// ==========
// Booking validtion
// ==========

// add new row button
$(".add_row").on("click", function (e) {
  e.preventDefault();
  addNewRow();
});

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
// $('.print_tag').attr('disabled', true);
// Print single Tag
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

// scan and search tray
$(".tray_id").on("focusout", function () {
  console.log("asdsd");
  let trays = [...document.querySelectorAll(".tray_collection option")];
  let validTray = trays.find((tray) => {
    return this.value === tray.value;
  });
  if (!validTray) {
    $(this).parent().removeClass("has-success").addClass("has-error");
    $(this).siblings(".help-block").html("Tray not identified!");
    // $('.submit-form').attr('disabled','true')
  } else {
    $(this).parent().removeClass("has-error").addClass("has-success");
    $(this).siblings(".help-block").html("Tray Identified");
    // $('.submit-form').removeAttr('disabled')
  }
});
