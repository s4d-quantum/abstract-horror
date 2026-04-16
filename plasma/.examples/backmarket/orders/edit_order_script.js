$(document).ready(function() {
  // disable btn by default
  // $(".add_row").attr("disabled", "true");
  // get all sales order items and match with them
  let salesOrderItems = document["querySelectorAll"](".sales-order-items li");
  let imeiFields = document.getElementsByClassName("imei-field");

  // get all sales items
  let D = document,
    sales_details = D["querySelectorAll"](".sales_details"),
    sales_color = D["querySelectorAll"](".sales_color"),
    sales_brand = D["querySelectorAll"](".sales_brand"),
    sales_gb = D["querySelectorAll"](".sales_gb"),
    sales_grade = D["querySelectorAll"](".sales_grade"),
    sales_tray = D["querySelectorAll"](".sales_tray"),
    sales_item_array = [];

  // fill sales_item_array with all items rows
  Array.prototype.slice.call(sales_tray).map((item, index) => {
    sales_item_array.push({
      item_details: sales_details[index].innerText.trim(),
      item_color: sales_color[index].innerText.trim(),
      item_brand: sales_brand[index].innerText.trim(),
      item_gb: sales_gb[index].innerText.trim(),
      item_grade: sales_grade[index].innerText.trim(),
      item_tray: sales_tray[index].innerText.trim(),
      item_imei: undefined
    });
  });

  // >>> THIS IS NOT IN NEW_ORDER_SCRIPT
  // fill sales_item_array will already selected items
  // ===========
  fillSalesOrderBySelectedItems();

  salesOrderItems = Array.prototype.slice
    .call(salesOrderItems)
    .map(item => item.innerHTML.trim());

  // new row started
  function addNewRow() {
    var newRow = `<tr>
        <td>
            <div class='form-group'>
                <input type='text' class='form-control imei-field' name='imei_field[]' required>
                <span class='help-block'></span>
            </div>
        </td>
        <td>
            <input type='text' class='form-control details-field' name='details_field[]' readonly>
            <input type='text' class='hide form-control order_id' name='order_id[]'>
        </td>
        <td>
            <input type='text' class='form-control brand-field' name='brand_field[]' readonly>
        </td>
        <td>
            <input type='text' class='form-control grade-field' name='grade_field[]' readonly>
        </td>
        <td>
            <input type='text' class='form-control color-field' name='color_field[]' readonly>
        </td>
        <td>
            <input type='text' class='form-control gb-field' name='gb_field[]' readonly>
        </td>
        <td>
            <button class="del_row btn btn-danger"><i class="fa fa-close"></i></button>  

        <input type = "number" name = "order_return[]"
        class = "hidden" value = "0" >
        <input type = "number" name = "status[]"
        class = "hidden" value = "0" >

        </td>
    </tr>`;

    $("#items_table")
      .find("tbody")
      .append(newRow)
      .children()
      .insertBefore(".add-new-row");

    updateTotalItems();

    // assign focusout to imei box
    imeiFields[imeiFields.length - 1].focus();
  } // new row ended

  // get grades
  var gradeField = [];
  $(".grade-field")
    .children()
    .each((i, item) => {
      gradeField.push({
        title: item.innerHTML.trim(),
        value: item.value
      });
    });

  // IMEI focus out
  function validateDetails() {
    var that = this;
    that.validInput = true;
    let sales_order_id = document.querySelector(".sales_order_id").value;
    // IMEI input
    const input = that.value;

    // IF INPUT LENGTH IS WRONG
    if (input.length <= 16 && input.length >= 15) {
      // All input values, to check if same imei added twice
      let allInputValues = [
        ...document.getElementsByClassName("imei-field")
      ].filter(item => {
        return item.value === input;
      });

      // if same imeis are added twice
      if (allInputValues.length > 1) {
        $(that)
          .parent()
          .removeClass("has-success")
          .removeClass("has-warning")
          .addClass("has-error");
        $(that)
          .siblings(".help-block")
          .html("Duplicate IMEI");
        $(".add_row").attr("disabled", "true");
        $(".submit-form").addClass("disabled");
        that.validInput = false;
        duplicateBeep.play(); //error beep
        this.value = "";
      }
      // If IMEI are unique
      else {
        console.log();
        $.ajax({
          type: "POST",
          url: "includes/fetch_imei.php",
          data: {
            item_imei: that.value,
            sales_order_id
          },
          success: function(data) {
            const stock = JSON.parse(data)[0];

            console.log(data);

            // IF STOCK NOT AVAILABLE
            if (!stock) {
              $(that)
                .parent()
                .removeClass("has-success")
                .removeClass("has-warning")
                .addClass("has-error");
              $(that)
                .siblings(".help-block")
                .html("Out of stock");
              $(".add_row").attr("disabled", "true");
              $(".submit-form").addClass("disabled");
              that.validInput = false;
              $(that).val("");
              outOfStock.play(); //error beep
            } else {
              // ============
              // IF IMEI IS AVAILABLE FOR SALE
              // THEN ADD IMEI to ITEM_IMEI index
              // ============
              let itemPresentInSalesItems = false;
              for (let index = 0; index < sales_item_array.length; index++) {
                if (
                  sales_item_array[index].item_details === stock.item_details &&
                  sales_item_array[index].item_color === stock.item_color &&
                  sales_item_array[index].item_brand === stock.item_brand &&
                  sales_item_array[index].item_gb === stock.item_gb &&
                  sales_item_array[index].item_grade === stock.grade &&
                  sales_item_array[index].item_tray === stock.tray_id &&
                  sales_item_array[index].item_imei === undefined
                ) {
                  sales_item_array[index] = {
                    ...sales_item_array[index],
                    item_imei: stock.item_imei
                  };
                  itemPresentInSalesItems = true;
                  break;
                } else if (
                  sales_item_array[index].item_details === stock.item_details &&
                  sales_item_array[index].item_color === stock.item_color &&
                  sales_item_array[index].item_brand === stock.item_brand &&
                  sales_item_array[index].item_gb === stock.item_gb &&
                  sales_item_array[index].item_grade === stock.grade &&
                  sales_item_array[index].item_tray === stock.tray_id &&
                  sales_item_array[index].item_imei === stock.item_imei
                ) {
                  sales_item_array[index] = {
                    ...sales_item_array[index],
                    item_imei: stock.item_imei
                  };
                  itemPresentInSalesItems = true;
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
                $(that)
                  .siblings(".help-block")
                  .html("Available!");
                $(".add_row").removeAttr("disabled");
                $(".submit-form").removeClass("disabled");

                let field = $(that)
                  .parent()
                  .parent()
                  .siblings();
                // filling rest of fields
                $(field)
                  .children(".details-field")
                  .val(stock.item_details);

                $(field)
                  .children(".order_id")
                  .val(stock.order_id);

                $(field)
                  .children(".brand-field")
                  .val(stock.title);

                if (parseInt(stock.grade) > 0) {
                  let grade = gradeField.filter((option, i) => {
                    console.log(option);
                    return option.value === stock.grade;
                  });
                  $(field)
                    .children(".grade-field")
                    .val(grade[0].title);
                }

                $(field)
                  .children(".color-field")
                  .val(stock.item_color);

                $(field)
                  .children(".gb-field")
                  .val(stock.item_gb);
              }
              // IF ITEM IS IN STOCK BUT NOT IN SALES ITEMS
              else {
                $(that)
                  .parent()
                  .removeClass("has-success")
                  .removeClass("has-warning")
                  .addClass("has-error");
                $(that)
                  .siblings(".help-block")
                  .html("Not in Sales Items");
                $(".add_row").attr("disabled", "true");
                $(".submit-form").addClass("disabled");
                that.validInput = false;
                duplicateBeep.play(); // invalid/Duplicate beep
                this.value = "";
              }
            } //else ended
          }, //success ended
          error: function(error) {
            console.log(error);
          }
        }); //ajax ended
      } //else ended
    }
    // IF LENGTH IS NOT RIGHT
    else {
      $(that)
        .parent()
        .removeClass("has-success")
        .removeClass("has-warning")
        .addClass("has-error");
      $(that)
        .siblings(".help-block")
        .html("16 or 15 digits required");
      $(".add_row").attr("disabled", "true");
      $(".submit-form").addClass("disabled");
      that.validInput = false;
      duplicateBeep.play(); //invalid/Duplicate beep
      that.value = "";
    } //length else ended
    return that.validInput;
  } //validate details ended

  // Barcode input on IMEI field
  $(document).on("keypress", ".imei-field", processKey);
  function processKey(event) {
    if (event.keyCode === 13) {
      event.preventDefault();
      let na = validateDetails.call(this);
      console.log(na);
      if (na) {
        addNewRow();
      }
    }
  }
  // validate on imei focusout
  // $(document).on('focusout', '.imei-field',function() {
  //     validateDetails.call(this);
  // });

  // remove row
  $(document).on("click", ".del_row", function(e) {
    e.preventDefault();

    // first delete this IMEI from sales_item_array
    // find this IMEI in sales_item_array,
    // if not then dont delete the row
    let thisIMEI = $(this)
      .parent()
      .siblings()
      .find(".imei-field")
      .val()
      .trim();

    // if input box is not empty
    let elementIndexInArray = 0;
    if (thisIMEI.length) {
      let isElement = sales_item_array.find((item, index) => {
        if (item.item_imei === thisIMEI) {
          elementIndexInArray = index;
        }
        return item.item_imei === thisIMEI;
      });
      // if index not undefined
      if (isElement) {
        sales_item_array.splice(elementIndexInArray, 1);
      }
      console.log(sales_item_array);
    }

    // delete row
    $(this)
      .parent()
      .parent()
      .remove();
    if ($(".has-error").length < 1) {
      $(".add_row").removeAttr("disabled");
      $(".submit-form").removeClass("disabled");
    }
    updateTotalItems();
  });

  // disable btn by default
  // $('.add_row').attr('disabled', 'true')
  // add new row button
  $(".add_row").on("click", function(e) {
    e.preventDefault();
    addNewRow();
  });

  // show/hide booking/submit button
  $(".submit-form").hide();
  $(document).on("click", ".booking-completed", function(e) {
    e.preventDefault();
    let allConditionsValid = false;

    // validate duplicate items
    let bookedItems = Array.prototype.slice
        .call(document.querySelectorAll(".imei-field"))
        .map(item => item.value),
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
    bookedItems.map(bookedItem => {
      sales_item_array.map(salesItem => {
        if (bookedItem === salesItem.item_imei) {
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
      $(".submit-form").show();
    }
  });

  let formSubmittedCount = 1;
  $(document).on("click", ".submit-form", function(e) {
    let inputsValidated = true; //default

    // check customer
    let customer = document.querySelector(".order_customer");
    // check IMEIs
    let imei = document.querySelectorAll(".imei-field");
    let checkImei = Array.prototype.filter.call(
      imei,
      item => item.value.length <= 0
    );
    // check brands
    let brand = document.querySelectorAll(".brand-field");
    let checkbrand = Array.prototype.filter.call(
      brand,
      item => item.value.length <= 0
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
    } else if (!inputsValidated || formSubmittedCount > 1) {
      console.log(`Form submitted ${formSubmittedCount} times!`);
      //   $(this).attr('disabled','disabled');
      e.preventDefault();
    }
  });
  // ==========
  // Booking validtion
  // ==========

  $("#order_date").datepicker({
    autoclose: true,
    format: "yyyy/mm/dd"
  });

  // calculate total items
  function updateTotalItems() {
    let t = $(".imei-field").length;
    console.log(t);
    $(".total_items").html(t);
  }

  // duplicate audio
  let duplicateBeep = document.querySelector("#duplicate-beep");

  // outofstock audio
  let outOfStock = document.querySelector("#outofstock-beep");


  // THIS FUNCTION WILL FILL SALES_ITEM_ARRAY WITH ALL RELEVANT IMEIS  ON PAGE LOAD 
  
  // function fillSalesOrderBySelectedItems() {
  //   for (let j = 0; i < imeiFields.length; j++){
  //     for (let index = 0; index < sales_item_array.length; index++) {
  //       if (
  //         sales_item_array[index].item_details === stock.item_details &&
  //         sales_item_array[index].item_color === stock.item_color &&
  //         sales_item_array[index].item_brand === stock.item_brand &&
  //         sales_item_array[index].item_gb === stock.item_gb &&
  //         sales_item_array[index].item_grade === stock.grade &&
  //         sales_item_array[index].item_tray === stock.tray_id &&
  //         sales_item_array[index].item_imei === undefined
  //       ) {
  //         sales_item_array[index] = {
  //           ...sales_item_array[index],
  //           item_imei: stock.item_imei
  //         };
  //         itemPresentInSalesItems = true;
  //         break;
  //       }
  //     }
  //   }
  // }
});
//document.ready ended
