// Add new row
let GBs = $(".gb-field").html(),
  rowId = 2;

var $tbody = $("#items_table").find("tbody");
// Add new row
function addNewRow() {
  var options = $(".brand-field").html().trim(),
    gradeOptions = $(".grade-field").html().trim(),
    trayOptions = $(".tray_collection").html().trim(),
    newRow = `<tr>
    <td class="row-id">
      ${rowId}
    </td>
    <td>
        <div class='form-group'>
          <input type='text' class='form-control imei-field' name='imei_field[]' tabindex='1' required>
          <span class='help-block imei-help-block'></span>
          <svg class="code727 code${rowId}"></svg>
        </div>
    </td>
    <td>
        <input type='text' class='form-control details-field' name='details_field[]' >
    </td>
    <td>
        <input type='text' class='form-control color-field' name='color_field[]' >
    </td>
    <td>
        <select class='form-control grade-field' name='grade_field[]' >
          <option value="">select</option>
          ${gradeOptions}
        </select>
    </td>
    <td>
        <select class='form-control brand-field' name='brand_field[]' >
        ${options}
        </select>
    </td>
    <td>
        <select class='form-control gb-field' name='gb_field[]' >
        ${GBs}
        </select>
    </td>
    <td>
      <select class='form-control tray-field' name='tray_field[]' >
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

  console.log(trayOptions);
  $tbody.append(newRow);

  updateTotalItems();

  // assign focusout to imei box
  imeiFields = document.getElementsByClassName("imei-field");
  imeiFields[imeiFields.length - 1].focus();

  $(".booking-completed").show();
  $(".submit-form").hide();
} //add new row ended

// get gb
var gbField = [];
$(".gb-field")
  .children()
  .each((i, item) => {
    gbField.push({
      title: item.innerHTML.trim(),
      value: item.value,
    });
  });

// get brands
var brandField = [];
$(".brand-field")
  .children()
  .each((i, item) => {
    brandField.push({
      title: item.innerHTML.trim(),
      value: item.value,
    });
  });

// get grades
var gradeField = [];
$(".grade-field")
  .children()
  .each((i, item) => {
    gradeField.push({
      title: item.innerHTML.trim(),
      value: item.value,
    });
  });

// get trays
var trayField = [];
$(".tray-field")
  .children()
  .each((i, item) => {
    trayField.push({
      title: item.innerHTML.trim(),
      value: item.value,
    });
  });

// validate form
let validateTimer;
$(".verify-form .fa-spin").hide();

/** validatedetails **/
let allAddedTacs = [];
function validateDetails() {
  var $that = $(this);

  // fetch all imei values
  let validImei = []; //array to store 0/1 for imei validity

  // check if imei length is correct
  if ($that.val().length >= 15 && $that.val().length <= 16) {
    // Check if same imei added twice
    let allInputValues = [
      ...document.getElementsByClassName("imei-field"),
    ].filter((input) => {
      return input.value === $that.val();
    });

    // if same imeis are added twice
    if (allInputValues.length > 1) {
      $that
        .parent()
        .removeClass("has-success")
        .removeClass("has-warning")
        .addClass("has-error");
      $that.siblings(".help-block").html("Duplicate IMEI");
      x.play(); //error beep
      this.value = "";
      return 0;
    }
    // if unique imei added
    else {
      $that
        .parent()
        .removeClass("has-success")
        .removeClass("has-warning")
        .removeClass("has-error");
      $that.siblings(".help-block").html("");
      /* 
            ===
            Now it breaks in 2 steps
            1 -check if tac is already available in DB, if yes then copy BRAND and DETAILS
            2 - check if same TAC is added above rows, if yes then copy color, gb and grade from there
            ===
            */

      // if the item is first so fetch tac from DB wether it already exists or not
      // else if item tac is repeatative then dont fetch from DB

      // TAC
      let currentTAC = $that.val().slice(0, 8);

      // save all added tacs here
      let isTacAlreadyAdded = allAddedTacs.filter((item) => {
        return item.tac === currentTAC ? item.tac : null;
      });

      // current Tac Data
      let currentTacData =
        isTacAlreadyAdded.length > 0 ? isTacAlreadyAdded[0] : null;

      // if tac is not already added then fetch from DB and add it
      if (isTacAlreadyAdded.length === 0) {
        // console.log('Fetch TAC from DB')
        $.ajax({
          type: "POST",
          url: "includes/fetch_imei.php",
          data: {
            TAC: currentTAC,
          },
          success: function (data) {
            let D = JSON.parse(data);

            console.log(D);
            // tac already exists in db
            if (D.item_tac !== null) {
              allAddedTacs.push({
                tac: currentTAC,
                details: D.details.item_details,
                brand: D.details.item_brand,
                status: "TAC_EXIST",
              });
            }
            // if tac does not already exists in db
            else {
              // console.log('NEW TAC')
              allAddedTacs.push({
                tac: currentTAC,
                details: null,
                brand: null,
                status: "NEW_TAC",
              });
            }

            // select currentTacData as last allAddedTacs item
            currentTacData = allAddedTacs[allAddedTacs.length - 1];

            drawItemRow($that, { ...currentTacData }, "TAC_IS_UNIQUE");
          }, //success ended
        });
      } //if ended
      else {
        drawItemRow($that, { ...currentTacData });
      }

      // // if validImei has done all imei validation
      // if ($('.imei-field').length === validImei.length) {
      //   let isValidImei = validImei.filter(item => item === 0);
      //   // if no invalid imei
      //   if (isValidImei.length < 1) {
      //     return 1;
      //   } else {
      //     return 0;
      //   }
      // }

      return 1;
    } //unique imei added else ended
  } // show error if imei length is incorrect
  else {
    $that
      .parent()
      .removeClass("has-success")
      .removeClass("has-warning")
      .addClass("has-error");
    $that.siblings(".help-block").html("16 or 15 digits required");
    validImei.push(0);
    x.play(); //error beep

    // // print button
    // $(siblings)
    //   .children('.print_tag').attr('disabled',true);

    return 0;
  }
} /**validatedetails ended**/

function drawItemRow($that, { ...currentTacData }, tacIsUnique) {
  // ========
  /* 2 - WHEN EVER NEW ROW IS CREATED
      Always copy color, grade and gb from previous row 
      no matter if the TAC is same or different
      // ========
      */

  const D = { ...currentTacData };

  let siblings = $that.parent().parent().siblings();

  //if item is new and unique tac
  if (D.status === "NEW_TAC" && tacIsUnique === "TAC_IS_UNIQUE") {
    // console.log('New and unique TAC')

    let anyLastRow = [...document.querySelectorAll(".imei-field")].map(
      (row) => {
        return row;
      }
    );
    anyLastRow = anyLastRow[anyLastRow.length - 3];
    anyLastRow = $(anyLastRow).parent().parent().siblings();

    let lastRowState = {
      grade: anyLastRow.children(".grade-field").val(),
      color: anyLastRow.children(".color-field").val(),
      gb: anyLastRow.children(".gb-field").val(),
      brand: anyLastRow.children(".brand-field").val(),
      details: anyLastRow.children(".details-field").val(),
      tray: anyLastRow.children(".tray-field").val(),
    };

    // item details
    $(siblings).children(".details-field").val("");

    // item brand
    let lastBrand = lastRowState.brand;
    $(siblings)
      .children(".brand-field")
      .children()
      .each((i, option) => {
        if (option.value === lastBrand) {
          $(option).attr("selected", "selected");
        } else {
          $(option).removeAttr("selected");
        }
      });

    // item color
    let lastColor = lastRowState.color;
    $(siblings).children(".color-field").val(lastColor);

    // item grade
    let lastgrade = lastRowState.grade;
    $(siblings)
      .children(".grade-field")
      .children()
      .each((i, option) => {
        if (option.value === lastgrade) {
          $(option).attr("selected", "selected");
        } else {
          $(option).removeAttr("selected");
        }
      });

    // item gb
    let lastGb = lastRowState.gb;
    $(siblings)
      .children(".gb-field")
      .children()
      .each((i, option) => {
        if (option.value === lastGb) {
          $(option).attr("selected", "selected");
        } else {
          $(option).removeAttr("selected");
        }
      });

    // item tray
    let lastTray = lastRowState.tray;
    $(siblings)
      .children(".tray-field")
      .children()
      .each((i, option) => {
        if (option.value === lastTray) {
          $(option).attr("selected", "selected");
        } else {
          $(option).removeAttr("selected");
        }
      });
  }

  //if item tac already exists and unique in the list as well
  else if (D.status === "TAC_EXIST" && tacIsUnique === "TAC_IS_UNIQUE") {
    // console.log('if item tac already exists in db and TAC is first time')

    let anyLastRow = [...document.querySelectorAll(".imei-field")].map(
      (row) => {
        return row;
      }
    );
    anyLastRow = anyLastRow[anyLastRow.length - 3];
    anyLastRow = $(anyLastRow).parent().parent().siblings();

    let lastRowState = {
      grade: anyLastRow.children(".grade-field").val(),
      color: anyLastRow.children(".color-field").val(),
      gb: anyLastRow.children(".gb-field").val(),
      brand: anyLastRow.children(".brand-field").val(),
      details: anyLastRow.children(".details-field").val(),
      tray: anyLastRow.children(".tray-field").val(),
    };

    // item details
    $(siblings)
      .children(".details-field")
      .val(D.details.length > 0 ? D.details : lastRowState.details);
    // console.log(D.details.length)

    // item brand
    let lastBrand = D.brand.length > 0 ? D.brand : lastRowState.brand;
    $(siblings)
      .children(".brand-field")
      .children()
      .each((i, option) => {
        if (option.value === lastBrand) {
          $(option).attr("selected", "selected");
        } else {
          $(option).removeAttr("selected");
        }
      });

    // item color
    let lastColor = lastRowState.color;
    $(siblings).children(".color-field").val(lastColor);

    // item grade
    let lastgrade = lastRowState.grade;
    $(siblings)
      .children(".grade-field")
      .children()
      .each((i, option) => {
        if (option.value === lastgrade) {
          $(option).attr("selected", "selected");
        } else {
          $(option).removeAttr("selected");
        }
      });

    // item gb
    let lastGb = lastRowState.gb;
    $(siblings)
      .children(".gb-field")
      .children()
      .each((i, option) => {
        if (option.value === lastGb) {
          $(option).attr("selected", "selected");
        } else {
          $(option).removeAttr("selected");
        }
      });

    // item Tray
    let lastTray = lastRowState.tray;
    $(siblings)
      .children(".tray-field")
      .children()
      .each((i, option) => {
        if (option.value === lastTray) {
          $(option).attr("selected", "selected");
        } else {
          $(option).removeAttr("selected");
        }
      });
  }

  // if item tac already exists but not unique
  else if (D.status === "TAC_EXIST") {
    // console.log('if item tac already exists in db')

    let anyLastRow = [...document.querySelectorAll(".imei-field")].map(
      (row) => {
        return row;
      }
    );
    anyLastRow = anyLastRow[anyLastRow.length - 2];
    anyLastRow = $(anyLastRow).parent().parent().siblings();

    let lastRowState = {
      grade: anyLastRow.children(".grade-field").val(),
      color: anyLastRow.children(".color-field").val(),
      gb: anyLastRow.children(".gb-field").val(),
      brand: anyLastRow.children(".brand-field").val(),
      details: anyLastRow.children(".details-field").val(),
      tray: anyLastRow.children(".tray-field").val(),
    };

    // item details
    $(siblings)
      .children(".details-field")
      .val(D.details.length > 0 ? D.details : lastRowState.details);
    // console.log(D.details.length)

    // item brand
    let lastBrand = D.brand.length > 0 ? D.brand : lastRowState.brand;
    $(siblings)
      .children(".brand-field")
      .children()
      .each((i, option) => {
        if (option.value === lastBrand) {
          $(option).attr("selected", "selected");
        } else {
          $(option).removeAttr("selected");
        }
      });

    // item color
    let lastColor = lastRowState.color;
    $(siblings).children(".color-field").val(lastColor);

    // item grade
    let lastgrade = lastRowState.grade;
    $(siblings)
      .children(".grade-field")
      .children()
      .each((i, option) => {
        if (option.value === lastgrade) {
          $(option).attr("selected", "selected");
        } else {
          $(option).removeAttr("selected");
        }
      });

    // item gb
    let lastGb = lastRowState.gb;
    $(siblings)
      .children(".gb-field")
      .children()
      .each((i, option) => {
        if (option.value === lastGb) {
          $(option).attr("selected", "selected");
        } else {
          $(option).removeAttr("selected");
        }
      });

    // item tray
    let lastTray = lastRowState.tray;
    $(siblings)
      .children(".tray-field")
      .children()
      .each((i, option) => {
        if (option.value === lastTray) {
          $(option).attr("selected", "selected");
        } else {
          $(option).removeAttr("selected");
        }
      });
  }

  // if item is new but not unique tac
  else {
    // console.log('if item is new but not unique tac')

    let anyLastRow = [...document.querySelectorAll(".imei-field")].map(
      (row) => {
        return row;
      }
    );
    anyLastRow = anyLastRow[anyLastRow.length - 2];
    anyLastRow = $(anyLastRow).parent().parent().siblings();

    let lastRowState = {
      grade: anyLastRow.children(".grade-field").val(),
      color: anyLastRow.children(".color-field").val(),
      gb: anyLastRow.children(".gb-field").val(),
      brand: anyLastRow.children(".brand-field").val(),
      details: anyLastRow.children(".details-field").val(),
      tray: anyLastRow.children(".tray-field").val(),
    };

    $(siblings).children(".details-field").val(lastRowState.details);

    // item brand
    let lastBrand = lastRowState.brand;
    $(siblings)
      .children(".brand-field")
      .children()
      .each((i, option) => {
        if (option.value === lastBrand) {
          $(option).attr("selected", "selected");
        } else {
          $(option).removeAttr("selected");
        }
      });

    // item color
    let lastColor = lastRowState.color;
    $(siblings).children(".color-field").val(lastColor);

    // item grade
    let lastgrade = lastRowState.grade;
    $(siblings)
      .children(".grade-field")
      .children()
      .each((i, option) => {
        if (option.value === lastgrade) {
          $(option).attr("selected", "selected");
        } else {
          $(option).removeAttr("selected");
        }
      });

    // item gb
    let lastGb = lastRowState.gb;
    $(siblings)
      .children(".gb-field")
      .children()
      .each((i, option) => {
        if (option.value === lastGb) {
          $(option).attr("selected", "selected");
        } else {
          $(option).removeAttr("selected");
        }
      });

    // item tray
    let lastTray = lastRowState.tray;
    $(siblings)
      .children(".tray-field")
      .children()
      .each((i, option) => {
        if (option.value === lastTray) {
          $(option).attr("selected", "selected");
        } else {
          $(option).removeAttr("selected");
        }
      });
  }
} //drawtacrow ended

// date picker
$("#purchase_date").datepicker({
  autoclose: true,
  format: "yyyy/mm/dd",
});

// Barcode input on IMEI field
$(document).on("keypress", ".imei-field", processKey);
function processKey(event) {
  if (event.keyCode === 13) {
    event.preventDefault();
    let na = validateDetails.call(this);
    if (na) {
      addNewRow();
    }
  }
}
// validate on imei focusout
$(document).on("focusout", ".imei-field", function () {
  // validateDetails.call(this);
});

// disable enter key
$(document).keypress(function (event) {
  let isImeiFocused = document.activeElement.className.indexOf("imei-field"); //find if imei field focused
  if (event.which == "13" && isImeiFocused === -1) {
    event.preventDefault();
    addNewRow();
  }
});

/** Print tag **/
// *****
$(".print_tag").attr("disabled", true);
// Print single Tag
$(document).on("click", ".print_tag", function (e) {
  e.preventDefault();
  printTag(this);
});

function formatStorage(gbVal) {
  const n = parseInt(gbVal, 10);
  if (!isFinite(n) || isNaN(n)) return '';
  return n >= 1024 ? n / 1024 + ' TB' : n + ' GB';
}

function printTag(that) {
  let imei = $(that).parent().parent().children().find(".imei-field").val(),
    details = $(that).parent().parent().children().find(".details-field").val(),
    color = $(that).parent().parent().children().find(".color-field").val(),
    gbVal = $(that).parent().parent().children().find(".gb-field").val(),
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

  const gbText = formatStorage(gbVal);

  var printContent = `
        <div class="item_imei_code">
          <p class="text-center show-on-print">
            ${brand} ${details} ${gbText} ${color} 
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
      .call(document.querySelectorAll(".imei-field"))
      .map((item) => item.value),
    validItems = false,
    bookingBtn = $(this);

  //now validate if no item already added in stock
  $.ajax({
    type: "POST",
    url: "includes/validate_imei.php",
    data: {
      items: {
        data: bookedItems,
      },
    },
    success: function (data) {
      $(".page-loader").hide();
      data = JSON.parse(data);
      // console.log(data);
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
});

let formSubmittedCount = 1;
$(document).on("click", ".submit-form", function (e) {
  e.preventDefault();
  let inputsValidated = true; //default

  let purchaseDate = document.querySelector(".purchase_date").value;
  // check supplier
  let supplier = document.querySelector(".purchase_supplier").value;

  // check QC
  let qc = parseInt(document.querySelector(".qc_required").value);

  let po_ref = document.querySelector(".po_ref").value;

  // check IMEIs
  let imei = document.querySelectorAll(".imei-field");
  let checkImei = Array.prototype.filter.call(
    imei,
    (item) => item.value.length <= 0
  );
  // check brands
  let brand = document.querySelectorAll(".brand-field");
  let checkbrand = Array.prototype.filter.call(
    brand,
    (item) => item.value.length <= 0
  );

  let details_field = document.querySelectorAll(".details-field"),
    color_field = document.querySelectorAll(".color-field"),
    grade_field = document.querySelectorAll(".grade-field"),
    gb_field = document.querySelectorAll(".gb-field"),
    tray = document.querySelectorAll(".tray-field"),
    user_id = document.querySelector(".user_id").value;

  tray = Array.prototype.map.call(tray, (item) => item.value);
  details_field = Array.prototype.map.call(details_field, (item) => item.value);
  color_field = Array.prototype.map.call(color_field, (item) => item.value);
  grade_field = Array.prototype.map.call(grade_field, (item) => item.value);
  gb_field = Array.prototype.map.call(gb_field, (item) => item.value);
  imei_field = Array.prototype.map.call(imei, (item) => item.value.trim());
  brand_field = Array.prototype.map.call(brand, (item) => item.value);

  // check supplier
  if (supplier.length <= 0) {
    inputsValidated = false;
    alert("supplier is missing!");
  }

  // check QC
  else if (qc.length <= 0) {
    inputsValidated = false;
    alert("QC/Repair requied or not?");
  }

  // check IMEIs
  else if (checkImei.length > 0) {
    inputsValidated = false;
    alert("imei missing");
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
        imei_field,
        purchase_supplier: supplier,
        qc_required: (qc === 2 || qc === 1) ? 1 : 0,
        repair_required: qc === 1 ? 1 : 0,
        brand_field,
        details_field,
        grade_field,
        gb_field,
        color_field,
        user_id,
      },
      success: function (data) {
        let D = JSON.parse(data);
        location.href = "purchase_details.php?pur_id=" + D;
        $(this).removeAttr("disabled");
      },
      error: function (data) {
        $(this).removeAttr("disabled");
        // console.log('ITEMS FAILED TO SUBMIT');
      },
    });
  } else if (!inputsValidated || formSubmittedCount > 1) {
    // console.log(`Form submitted ${formSubmittedCount} times!`);
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
    // $('.submit-form').removeClass('disabled');
  }
  updateTotalItems();
});

// calculate total items
function updateTotalItems() {
  let t = $(".imei-field").length;
  $(".total_items").html(t);
}

// Beep audio
let x = document.querySelector("#myAudio");
