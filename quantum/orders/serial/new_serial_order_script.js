let salesTest = [];

$(document).ready(function () {
  let sales_order_id = document.querySelector(".sales_order_id").value;
  var brands = [];
  var new_item_code = "";

  // get all sales order items and match with them
  let insertedSalesItems = [];
  let salesOrderItems = document["querySelectorAll"](".sales-order-items li");
  let imeiFields = document.getElementsByClassName("item_code");

  // get all sales items
  let D = document,
    pageLoader = D["querySelector"](".page-loader"),
    sales_details = D["querySelectorAll"](".sales_details"),
    sales_brand = D["querySelectorAll"](".sales_brand"),
    sales_grade = D["querySelectorAll"](".sales_grade"),
    sales_tray = D["querySelectorAll"](".sales_tray"),
    sales_supplier = D["querySelectorAll"](".sales_supplier"),
    sales_item_array = [];

  // Hide page loader on page
  pageLoader.style.display = "none";

  // fill sales_item_array with all items rows
  Array.prototype.slice.call(sales_tray).map((item, index) => {
    sales_item_array.push({
      item_details: sales_details[index].innerText.trim(),
      item_brand: sales_brand[index].innerText.trim(),
      item_grade: sales_grade[index].innerText.trim(),
      item_tray: sales_tray[index].innerText.trim(),
      item_supplier: sales_supplier[index].innerText.trim(),
      item_code: undefined,
    });
  });
  console.log(sales_item_array);

  salesOrderItems = Array.prototype.slice
    .call(salesOrderItems)
    .map((item) => item.innerHTML.trim());

  // for testing purposein chrome dev
  salesTest = [...sales_item_array];

  // add new row started
  function addNewRow() {
    new_item_code += `<tr>
        <td>
            <div class="form-group">
            <input type="text" name="item_code[]" placeholder="Item code" 
            class="form-control item_code" required>
            <span class="help-block"></span>
            </div>
        </td>

        <td>
            <input type="text" name="item_brand[]" placeholder="Item Brand" 
            class="form-control item_brand">
        </td>

        <td><input  class='item_details form-control' placeholder="Item details" 
        type='text' name='item_details[]'></td>

        <td><input  class='item_grade form-control' placeholder="Item grade" 
        type='text' name='item_grade[]'></td>

        <td>
            <button class="del_row btn btn-danger"><i class="fa fa-close"></i></button>  
        </td>
    </tr>`;

    $("#order_items")
      .find("tbody")
      .append(new_item_code)
      .children()
      .insertBefore(".add_new_row");
    new_item_code = "";

    updateTotalItems();

    // assign focusout to item box
    itemFields = document.getElementsByClassName("item_code");
    itemFields[itemFields.length - 1].focus();
  } // add new row ended

  // get brands
  $(".brands")
    .children()
    .each((i, item) => {
      brands.push({
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

  // disbale btn by default
  $(".add_row").attr("disabled", "true");

  function validateDetails(itemCode) {
    var that = this;
    that.validInput = true;
    let sales_order_id = document.querySelector(".sales_order_id").value;
    // INPUT VALUE
    const input = itemCode;

    // Check if same item added twice
    let allInputValues = [
      ...document.getElementsByClassName("item_code"),
    ].filter((item) => {
      return item.value === input;
    });

    // if same items are added twice
    if (allInputValues.length > 1) {
      $(this)
        .parent()
        .removeClass("has-success")
        .removeClass("has-warning")
        .addClass("has-error");
      $(this).siblings(".help-block").html("Duplicate");
      $(".add_row").attr("disabled", "true");
      $("#submit_order").attr("disabled", "true");
      itemCode = "";
      that.validInput = false;
      duplicateBeep.play().then((item) => console.log(item)); //error beep
    }
    // If items are all unique
    else {
      let $that = $(this);

      $("#submit_order").removeAttr("disabled");
      $.ajax({
        type: "POST",
        url: "includes/fetch_serial_order.php",
        data: {
          item_code: input,
        },
        success: function (data) {
          console.log(data);
          let stock = JSON.parse(data);

          if (stock !== null) {
            // ============
            // IF IMEI IS AVAILABLE FOR SALE
            // THEN ADD IMEI to ITEM_code index
            // ============
            let itemPresentInSalesItems = false;
            for (let index = 0; index < sales_item_array.length; index++) {
              if (
                sales_item_array[index].item_details === stock.item_details &&
                sales_item_array[index].item_brand === stock.item_brand &&
                sales_item_array[index].item_grade === stock.grade &&
                sales_item_array[index].item_tray === stock.tray_id &&
                sales_item_array[index].item_code === undefined
              ) {
                sales_item_array[index] = {
                  ...sales_item_array[index],
                  item_code: stock.item_code,
                };
                itemPresentInSalesItems = true;
                // if IMEI not already added to insertedSalesItems array then add it
                if (
                  !insertedSalesItems.find(
                    (item) => item.item_code === stock.item_code
                  )
                ) {
                  insertedSalesItems.push({
                    ...sales_item_array[index],
                    item_code: stock.item_code,
                  });
                }
                break;
              } else if (
                sales_item_array[index].item_details === stock.item_details &&
                sales_item_array[index].item_brand === stock.item_brand &&
                sales_item_array[index].item_grade === stock.grade &&
                sales_item_array[index].item_tray === stock.tray_id &&
                sales_item_array[index].item_code === stock.item_code
              ) {
                sales_item_array[index] = {
                  ...sales_item_array[index],
                  item_code: stock.item_code,
                };
                itemPresentInSalesItems = true;
                // if IMEI not already added to insertedSalesItems array then add it
                if (
                  !insertedSalesItems.find(
                    (item) => item.item_code === stock.item_code
                  )
                ) {
                  insertedSalesItems.push({
                    ...sales_item_array[index],
                    item_code: stock.item_code,
                  });
                }
                break;
              }
            }

            // ONLY PROCEED FURTHER IF THIS ITEM PRESENT IN STOCK ITEMS
            if (itemPresentInSalesItems) {
              that.validInput = true;
              $(that)
                .parent()
                .removeClass("has-warning")
                .removeClass("has-error")
                .addClass("has-success");
              $(that).siblings(".help-block").html("Available!");
              $(".add_row").removeAttr("disabled");
              $("#submit_order").removeAttr("disabled");

              let field = $(that).parent().parent().siblings();

              // details
              $(field).children(".item_details").val(stock.item_details);

              // order id
              $(field).children(".order_id").val(stock.order_id);

              // brand
              $(field).children(".item_brand").val(stock.title);

              // grade
              if (parseInt(stock.grade) > 0) {
                let grade = gradeField.filter((option, i) => {
                  return option.value === stock.grade;
                });
                $(field).children(".item_grade").val(grade[0].title);
              }
            }
            // IF ITEM IS IN STOCK BUT NOT IN SALES ITEMS
            else {
              $(that)
                .parent()
                .removeClass("has-success")
                .removeClass("has-warning")
                .addClass("has-error");
              $(that).siblings(".help-block").html("Not in Sales Items");
              $(".add_row").attr("disabled", "true");
              $("#submit_order").attr("disabled", "true");
              duplicateBeep.play().then((item) => console.log(item)); // invalid/Duplicate beep
              that.validInput = false;
              itemCode = "";
            }
          }
          // IF STOCK NOT AVAILABLE
          else {
            $(that)
              .parent()
              .removeClass("has-success")
              .removeClass("has-warning")
              .addClass("has-error");
            $(that).siblings(".help-block").html("Out of stock");
            $(".add_row").attr("disabled", "true");
            $("#submit_order").addClass("disabled");
            outOfStock.play().then((item) => item); //error beep
            that.validInput = false;
            itemCode = "";
          } //else ended
        }, //success ended
        error: function (error) {
          console.log(error);
        },
      });
    }
    return that.validInput;
  } //focusout ended

  // Barcode input on item field
  $(document).on("keypress", ".item_code", processKey);
  function processKey(event) {
    if (event.keyCode === 13) {
      event.preventDefault();
      let na = validateDetails.call(this, this.value);
      if (na) {
        addNewRow();
      }
    }
  }

  // ==========
  // Booking validtion
  // ==========
  // show/hide booking/submit button
  $("#submit_order").hide();
  $(".booking-completed").on("click", function (e) {
    e.preventDefault();
    let allConditionsValid = false;

    // validate duplicate items
    let bookedItems = Array.prototype.slice
        .call(document.querySelectorAll(".item_code"))
        .map((item) => item.value),
      duplicateItems = [];

    // check dulicate items
    for (let i = 0; i < bookedItems.length; i++) {
      for (let j = bookedItems.length - 1; j > i; j--) {
        if (bookedItems[i] == bookedItems[j]) {
          duplicateItems.push(bookedItems[i]);
        }
      }
    }

    // CHECK EACH ITEM MATCHING WITH SALES ITEMS
    //Match with sales item and see if all items are same or
    // is there any conflicted item as well
    let matchedWithSalesItems = [];
    bookedItems.map((bookedItem) => {
      sales_item_array.map((salesItem) => {
        if (bookedItem === salesItem.item_code) {
          matchedWithSalesItems.push(bookedItem);
        }
      });
    });

    console.log(imeiFields.length);

    // if any duplicate items
    if (duplicateItems.length > 0) {
      alert("Duplciate Items: " + duplicateItems.join(", "));
    }
    // if added items are not all same as sales items
    if (
      sales_item_array.length !== matchedWithSalesItems.length ||
      sales_item_array.length !== imeiFields.length
    ) {
      alert("Items different from Sales items");
    } else {
      allConditionsValid = true;
    }

    // if no duplicate item and
    // items are all same as sales items
    // then approve it and show submit button
    if (allConditionsValid) {
      $(this).hide();
      $("#submit_order").removeAttr("disabled");
      $("#submit_order ").show();
    }
  });

  let formSubmittedCount = 1;
  $(document).on("click", "#submit_order", function (e) {
    let inputsValidated = true; //default

    // check customer
    let customer = document.querySelector(".order_customer");
    // check serials
    let serial = document.querySelectorAll(".item_code");
    let checkserial = Array.prototype.filter.call(
      serial,
      (item) => item.value.length <= 0
    );
    // check brands
    let brand = document.querySelectorAll(".item_brand");
    let checkbrand = Array.prototype.filter.call(
      brand,
      (item) => item.value.length <= 0
    );

    // check boxes
    let boxes = document.querySelector(".total_boxes");

    // check pallets
    let pallets = document.querySelector(".total_pallets");

    // check box
    if (parseInt(boxes.value) < 0 || isNaN(parseInt(boxes.value))) {
      inputsValidated = false;
      alert("Add Boxes!");
    }

    // check pallet
    else if (parseInt(pallets.value) < 0 || isNaN(parseInt(pallets.value))) {
      inputsValidated = false;
      alert("Add pallets!");
    }

    // check customer
    else if (customer.value.length <= 0) {
      inputsValidated = false;
      alert("customer is missing!");
    }

    // check serials
    else if (checkserial.length > 0) {
      inputsValidated = false;
      alert("serial missing");
    }

    // check brands
    else if (checkbrand.length > 0) {
      inputsValidated = false;
      alert("brand missing");
    }

    if (inputsValidated && formSubmittedCount == 1) {
      formSubmittedCount++;
    } else if (!inputsValidated || formSubmittedCount > 1) {
      console.log(`Form submitted ${formSubmittedCount} times!`);
      //   $(this).attr('disabled','disabled');
      e.preventDefault();
    }
  });
  // ==========
  // Booking validtion
  // ==========

  // disable enter key
  // $(document).keypress(function (event) {
  //   let isitemFocused = document.activeElement.className.indexOf("item-field"); //find if item field focused
  //   if (event.which == "13" && isitemFocused === -1) {
  //     event.preventDefault();
  //     addNewRow();
  //   }
  // });

  $(document).ready(function () {
    $(".select2").select2();
  });

  ///////////////
  // SUBMIT FORM
  //////////////
  $("#submit_order").on("click", function (e) {
    if ($("#order_items tbody tr").length <= 0) {
      alert("No item selected!");
      e.preventDefault();
    }
  });

  // remove row
  $(document).on("click", ".del_row", function (e) {
    e.preventDefault();

    // first delete this IMEI from sales_item_array
    // find this IMEI in sales_item_array,
    // if not then dont delete the row
    let thisIMEI = $(this).parent().siblings().find(".item_code").val().trim();

    // if input box is not empty
    if (thisIMEI.length) {
      sales_item_array = sales_item_array.filter((item) => item !== thisIMEI);
      insertedSalesItems = insertedSalesItems.filter((item) => {
        return item.item_code !== thisIMEI;
      });
      console.log(insertedSalesItems);
    }

    // delete row
    $(this).parent().parent().remove();
    if ($(".has-error").length < 1) {
      $(".add_row").removeAttr("disabled");
      $("#submit_order").removeAttr("disabled");
    }
    updateTotalItems();
  });

  // disable btn by default
  $(".add_row").attr("disabled", "true");
  // add new row button
  $(".add_row").on("click", function (e) {
    e.preventDefault();
    addNewRow();
  });

  // calculate total items
  function updateTotalItems() {
    let t = $(".item_code").length;
    console.log(t);
    $(".total_items").html(t);
  }

  // duplicate audio
  let duplicateBeep = document.querySelector("#duplicate-beep");

  // outofstock audio
  let outOfStock = document.querySelector("#outofstock-beep");

  $(".add_accessories_btn").on("click", () => {
    requiredAndRemainingSalesItems(sales_item_array, insertedSalesItems);
  });

  /*
Group similar items from both 'sales_item_array' and 'bookeditems'
and show total and missing count for each group item in 'view sales items' modal
*/
  function requiredAndRemainingSalesItems(requiredItems, insertedItems) {
    // Group requiredItems and calculate total count
    let groupRequiredItems = _.groupBy(requiredItems, (item) => {
      if (
        item.item_brand &&
        item.item_details &&
        item.item_grade &&
        item.item_supplier &&
        item.item_tray
      ) {
        return `${
          item.item_brand +
          item.item_details +
          item.item_grade +
          item.item_tray +
          item.item_supplier
        }`;
      }
    });
    groupRequiredItems = _.toArray(groupRequiredItems).map((group) => ({
      ...group[0],
      qty: group.length,
    }));

    // Group requiredItems and calculate total count
    let groupInsertedItems = _.groupBy(insertedItems, (item) => {
      if (
        item.item_brand &&
        item.item_details &&
        item.item_grade &&
        item.item_supplier &&
        item.item_tray
      ) {
        return `${
          item.item_brand +
          item.item_details +
          item.item_grade +
          item.item_tray +
          item.item_supplier
        }`;
      }
    });
    groupInsertedItems = _.toArray(groupInsertedItems).map((group) => ({
      ...group[0],
      qty: group.length,
    }));

    // ---
    // Drawing view
    // ---
    let tr = "";
    groupRequiredItems.forEach((item) => {
      const {
        item_brand,
        item_details,
        item_grade,
        item_tray,
        qty,
        item_supplier,
      } = item;

      console.log(item);
      // get inserted qty of this item
      let insertedQty = 0;
      if (groupInsertedItems.length > 0) {
        insertedQty = groupInsertedItems.find((inserted) => {
          return (
            inserted.item_brand === item_brand &&
            inserted.item_details === item_details &&
            inserted.item_grade === item_grade &&
            inserted.item_supplier === item_supplier &&
            inserted.item_tray === item_tray
          );
        });
        if (insertedQty !== undefined) {
          insertedQty = insertedQty.qty;
        } else {
          insertedQty = 0;
        }
      }
      tr += `
      <div class="divTableRow" style="font-size:14px;">
        <div class="divTableCell flex4"> 
          ${findBrand(item_brand)} ${item_details} ${findGrade(
        item_grade
      )} - <span class="text-primary">${findSupplier(
        item_supplier
      )}</span> <span class="label label-info">${item_tray}</span>
        </div>
        <div class="divTableCell flex1">${qty}</div>
        <div class="divTableCell flex1 ${
          qty - insertedQty > 0 ? "text-red" : ""
        }">${groupInsertedItems.length ? qty - insertedQty : qty}</div>
      </div>
    `;
    });
    $(".sales-order-visible-items > .divTableBody").html(tr);
    // ---
    // completed Drawing view
    // ---
  }
  requiredAndRemainingSalesItems(sales_item_array, insertedSalesItems);

  ///////////////
  // SAVE ITEMS
  // save all scanned items
  const saveBtn = D["querySelector"](".save_btn");
  saveBtn.addEventListener("click", saveAllScannedItems);

  function saveAllScannedItems() {
    let allItems = Array.apply(null, D["querySelectorAll"](".item_code")).map(
      (item) => item.value
    );

    // remove empty indexes if any
    allItems = allItems.filter((item) => (item.length ? item : null));

    if (allItems.length) {
      localStorage.setItem(
        `serial-sales-order-${sales_order_id}`,
        JSON.stringify(allItems)
      );
      $.notify("Items Saved!", {
        className: "success",
        showDuration: 100,
      });
    } else {
      $.notify("No items to save", {
        className: "error",
        showDuration: 100,
      });
    }
    $(".auto_scan").removeAttr("disabled");
  }

  // Fetch already saved items if any
  const isDataAvailable = localStorage.getItem(
    `serial-sales-order-${sales_order_id}`
  );
  // if saved items are available
  if (!isDataAvailable) {
    $(".auto_scan").attr("disabled", "disabled");
  } else {
    $(".auto_scan").removeAttr("disabled");
  }

  // AUTO SCAN
  const autoScan = D["querySelector"](".auto_scan");
  autoScan.addEventListener("click", autoScanAllSavedItems);
  function autoScanAllSavedItems() {
    pageLoader.style.display = "block"; //show loading on whole page until all items are fetched
    const isDataAvailable = localStorage.getItem(
      `serial-sales-order-${sales_order_id}`
    );
    // if saved items are available
    if (isDataAvailable) {
      const reScan = JSON.parse(isDataAvailable);

      // flush whole table first
      $("#order_items").find("tbody").html("");

      reScan.forEach((imei) => {
        // Create new row and get focus on imei text box
        addNewRow();

        // get last row index, select last row textbox and apply validateDetails function on it
        const allIMEI = D["querySelectorAll"](".item_code");
        const lastRowIndex = allIMEI.length - 1;
        const that = allIMEI[lastRowIndex];
        that.value = imei;
        validateDetails.call(that, imei);
      });
      pageLoader.style.display = "none";
      $.notify("Fetched all saved items!", {
        className: "success",
        showDuration: 100,
      });
    } else {
      $.notify("No items found!", {
        className: "error",
        showDuration: 100,
      });
      pageLoader.style.display = "none";
      console.log("no any saved items ");
    }
  }
});
//document.ready ended

// Find/Search supplier
function findSupplier(supplierId) {
  let selectedSupplier = "";
  if (supplierId) {
    // fetch suppliers
    let supplierOptions = [];
    for (let supplier of $(".supplier-field").children()) {
      supplierOptions.push({
        value: supplier.value,
        title: supplier.innerHTML.trim(),
      });
    }
    selectedSupplier = supplierOptions.find(
      (supplier) => supplier.value === supplierId
    ).title;
  }
  return selectedSupplier;
}

// Find/Search brand
function findBrand(brandId) {
  // fetch brands
  let brandOptions = [];
  for (let brand of $(".brand-field").children()) {
    brandOptions.push({
      value: brand.value,
      title: brand.innerHTML.trim(),
    });
  }

  let selectedBrand = brandOptions.find((brand) => brand.value === brandId)
    .title;
  return selectedBrand;
}

// Find/Search Grade
function findGrade(gradeId) {
  // fetch grades
  let gradeOptions = [];
  for (let grade of $(".grade-field").children()) {
    gradeOptions.push({
      value: grade.value,
      title: grade.innerHTML.trim(),
    });
  }

  let selectedGrade = "";
  if (parseInt(gradeId) > 0) {
    selectedGrade =
      "Grade " + gradeOptions.find((grade) => grade.value === gradeId).title;
  }
  return selectedGrade;
}
