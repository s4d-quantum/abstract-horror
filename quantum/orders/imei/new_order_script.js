let salesTest = [];
$(document).ready(function () {
  let sales_order_id = document.querySelector(".sales_order_id").value;
  // disable btn by default
  $(".add_row").attr("disabled", "true");
  // get all sales order items and match with them
  let insertedSalesItems = [];
  let salesOrderItems = document["querySelectorAll"](".sales-order-items li");
  let imeiFields = document.getElementsByClassName("imei-field");

  // get all sales items
  let D = document,
    pageLoader = D["querySelector"](".page-loader");
  (sales_details = D["querySelectorAll"](".sales_details")),
    (sales_color = D["querySelectorAll"](".sales_color")),
    (sales_brand = D["querySelectorAll"](".sales_brand")),
    (sales_gb = D["querySelectorAll"](".sales_gb")),
    (sales_grade = D["querySelectorAll"](".sales_grade")),
    (sales_tray = D["querySelectorAll"](".sales_tray")),
    (sales_supplier = D["querySelectorAll"](".sales_supplier")),
    (sales_item_array = []);

  // Hide page loader on page
  pageLoader.style.display = "none";

  // fill sales_item_array with all items rows
  Array.prototype.slice.call(sales_tray).map((item, index) => {
    sales_item_array.push({
      item_details: sales_details[index].innerText.trim(),
      item_color: sales_color[index].innerText.trim(),
      item_brand: sales_brand[index].innerText.trim(),
      item_gb: sales_gb[index].innerText.trim(),
      item_grade: sales_grade[index].innerText.trim(),
      item_tray: sales_tray[index].innerText.trim(),
      item_supplier: sales_supplier[index].innerText.trim(),
      item_imei: undefined,
    });
  });

  salesOrderItems = Array.prototype.slice
    .call(salesOrderItems)
    .map((item) => item.innerHTML.trim());

  // for testing purposein chrome dev
  salesTest = [...sales_item_array];

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
                <input type='text' class='hide form-control order_id' name='order_id[]' readonly>
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
                <button class="del_row btn btn-danger"><i class="fa fa-close"></i>
                <span class="imei_value"></span></button>  
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
        value: item.value,
      });
    });

  // IMEI focus out
  function validateDetails(imeiValue) {
    var that = this;
    that.validInput = true;
    // IMEI input
    const input = imeiValue;

    // IF INPUT LENGTH IS WRONG
    if (input.length <= 16 && input.length >= 15) {
      // All input values, to check if same imei added twice
      let allInputValues = [
        ...document.getElementsByClassName("imei-field"),
      ].filter((item) => {
        return item.value === input;
      });

      // if same imeis are added twice
      if (allInputValues.length > 1) {
        $(that)
          .parent()
          .removeClass("has-success")
          .removeClass("has-warning")
          .addClass("has-error");
        $(that).siblings(".help-block").html("Duplicate IMEI");
        $(".add_row").attr("disabled", "true");
        $(".submit-form").addClass("disabled");
        that.validInput = false;
        playErrorSound('duplicate'); // invalid/Duplicate beep
        this.value = "";
      }

      // If IMEI are unique and not duplicate
      else {
        $.ajax({
          type: "POST",
          url: "includes/fetch_imei.php",
          data: {
            item_imei: input,
            sales_order_id,
          },
          success: function (data) {
            const stock = JSON.parse(data)[0];
            // console.log(data);

            // IF STOCK NOT AVAILABLE
            if (!stock) {
              $(that)
                .parent()
                .removeClass("has-success")
                .removeClass("has-warning")
                .addClass("has-error");
              $(that).siblings(".help-block").html("Out of stock");
              $(".add_row").attr("disabled", "true");
              $(".submit-form").addClass("disabled");
              that.validInput = false;
              input = "";
              playErrorSound('outofstock'); //error beep
            } else {
              // console.log(sales_item_array);
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
                    item_imei: stock.item_imei,
                  };
                  itemPresentInSalesItems = true;
                  // if IMEI not already added to insertedSalesItems array then add it
                  if (
                    !insertedSalesItems.find(
                      (item) => item.item_imei === stock.item_imei
                    )
                  ) {
                    insertedSalesItems.push({
                      ...sales_item_array[index],
                      item_imei: stock.item_imei,
                    });
                  }
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
                    item_imei: stock.item_imei,
                  };
                  itemPresentInSalesItems = true;
                  // if IMEI not already added to insertedSalesItems array then add it
                  if (
                    !insertedSalesItems.find(
                      (item) => item.item_imei === stock.item_imei
                    )
                  ) {
                    insertedSalesItems.push({
                      ...sales_item_array[index],
                      item_imei: stock.item_imei,
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
                $(".submit-form").removeClass("disabled");

                let field = $(that).parent().parent().siblings();

                // details
                $(field).children(".details-field").val(stock.item_details);

                // order id
                $(field).children(".order_id").val(stock.order_id);

                // brand
                $(field).children(".brand-field").val(stock.title);

                // grade
                if (parseInt(stock.grade) > 0) {
                  let grade = gradeField.filter((option, i) => {
                    return option.value === stock.grade;
                  });
                  $(field).children(".grade-field").val(grade[0].title);
                }

                // color
                $(field).children(".color-field").val(stock.item_color);

                // gb
                $(field).children(".gb-field").val(stock.item_gb);
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
                $(".submit-form").addClass("disabled");
                that.validInput = false;
                playErrorSound('duplicate'); // invalid/Duplicate beep
                this.value = "";
              }
            } //else ended
          }, //success ended
          error: function (error) {
            console.log(error);
          },
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
      $(that).siblings(".help-block").html("16 or 15 digits required");
      $(".add_row").attr("disabled", "true");
      $(".submit-form").addClass("disabled");
      that.validInput = false;
      playErrorSound('duplicate'); //invalid/Duplicate beep
      input = "";
    } //length else ended
    return that.validInput;
  } //validate details ended

  // Barcode input on IMEI field
  $(document).on("keypress", ".imei-field", processKey);
  function processKey(event) {
    if (event.keyCode === 13) {
      event.preventDefault();
      let na = validateDetails.call(this, this.value);
      // console.log(na);
      if (na) {
        addNewRow();
      }
    }
  }
  // validate on imei focusout
  // $(document).on("focusout", ".imei-field", function() {
  //   validateDetails.call(this);
  // });

  // remove row
  $(document).on("click", ".del_row", function (e) {
    e.preventDefault();

    // first delete this IMEI from sales_item_array
    // find this IMEI in sales_item_array,
    // if not then dont delete the row
    let thisIMEI = $(this).parent().siblings().find(".imei-field").val().trim();

    // if input box is not empty
    // console.log(thisIMEI);
    if (thisIMEI.length) {
      sales_item_array = sales_item_array.filter((item) => item !== thisIMEI);
      insertedSalesItems = insertedSalesItems.filter(
        (item) => item.item_imei !== thisIMEI
      );
      // console.log(insertedSalesItems);
    }

    // delete row
    $(this).parent().parent().remove();
    if ($(".has-error").length < 1) {
      $(".add_row").removeAttr("disabled");
      $(".submit-form").removeClass("disabled");
    }
    updateTotalItems();
  });

  // add new row button
  $(".add_row").on("click", function (e) {
    e.preventDefault();
    addNewRow();
  });

  // ==========
  // Booking validtion
  // ==========

  // show/hide booking/submit button
  $(".submit-form").hide();
  $(document).on("click", ".booking-completed", function (e) {
    e.preventDefault();
    let allConditionsValid = false;

    // validate duplicate items
    let bookedItems = Array.prototype.slice
        .call(document.querySelectorAll(".imei-field"))
        .map((item) => item.value),
      duplicateItems = [];

    // check duplicate items
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
        if (bookedItem === salesItem.item_imei) {
          matchedWithSalesItems.push(salesItem);
        }
      });
    });

    // if any duplicate items
    if (duplicateItems.length > 0) {
      alert("Duplicate Items: " + duplicateItems.join(", "));
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
      
      // Also hide the "Book DPD and update BM" button after booking is completed
      // to prevent users from booking multiple shipments for the same order
      $(".book-dpd-bm").hide();
    }
  });

  // Handle Book Delivery button click
  $(document).on("click", "#book_delivery", function(e) {
    e.preventDefault();
    
    // Get selected delivery company
    let selectedCompany = $("#delivery_company").val();
    if (!selectedCompany) {
      alert("Please select a delivery company first.");
      return;
    }
    
    // For now, only support DPD
    if (selectedCompany !== "DPD") {
      alert("Booking is currently only supported for DPD. Other carriers will be added later.");
      return;
    }
    
    // Get the PO reference from the input field
    let poRef = $("input[name='po_box']").val();
    
    if (!poRef) {
      alert("PO Reference is required to book DPD shipment.");
      return;
    }
    
    // Confirm with user before proceeding
    if (!confirm("Are you sure you want to book this shipment with DPD?")) {
      return;
    }
    
    // Show loading indicator
    $(".page-loader").show();
    
    // Disable the button to prevent multiple clicks
    $("#book_delivery").prop("disabled", true);
    
    // Call the PHP script to handle DPD booking and BackMarket update
    $.ajax({
      type: "POST",
      url: "includes/book_dpd_and_update_bm.php",
      data: {
        po_ref: poRef,
        dpd_only: 1
      },
      success: function(response) {
        $(".page-loader").hide();
        $("#book_delivery").prop("disabled", false);
        try {
          let result = JSON.parse(response);
          if (result.success) {
            // Update the delivery company and tracking number fields
            $("#delivery_company").val("DPD");
            $("input[name='tracking_no']").val(result.tracking_number);

            // Add hidden input for tracking_no to be submitted with the form
            $("<input>").attr({
              type: "hidden",
              name: "dpd_tracking_no",
              value: result.tracking_number
            }).appendTo("form");

            // Show success message
            let message = "DPD booking completed successfully. Tracking number: " + result.tracking_number;
            if (result.dpd_only) {
              message += "\n\nNext step: Go to the order details page and click Update BM.";
            }
            alert(message);
          } else {
            alert("Error: " + result.message);
          }
        } catch (e) {
          console.error("Error parsing response:", e);
          console.error("Response was:", response);
          alert("An error occurred while processing the request. Please check the logs.");
        }
      },
      error: function(xhr, status, error) {
        $(".page-loader").hide();
        $("#book_delivery").prop("disabled", false);
        console.error("AJAX Error:", error);
        console.error("Response:", xhr.responseText);
        alert("An error occurred while processing the request. Please check the logs.");
      }
    });
  });

  // Handle Book DPD and update BM button click
  $(document).on("click", ".book-dpd-bm", function(e) {
    e.preventDefault();

    // Check if this is a Backmarket order (customer should be CST-78)
    // We'll add a data attribute to the button to verify this
    if (!$(this).data('backmarket')) {
      alert("This feature is only available for Backmarket orders.");
      return;
    }

    // Validate that all required items are scanned and match sales items
    let allConditionsValid = false;

    // validate duplicate items
    let bookedItems = Array.prototype.slice
        .call(document.querySelectorAll(".imei-field"))
        .map(item => item.value),
      duplicateItems = [];

    // check duplicate items
    for (let i = 0; i < bookedItems.length; i++) {
      for (let j = bookedItems.length - 1; j > i; j--) {
        if (bookedItems[i] == bookedItems[j]) {
          duplicateItems.push(bookedItems[i]);
        }
      }
    }

    // CHECK EACH ITEM MATCHING WITH SALES ITEMS
    // Match with sales item and see if all items are same or
    // is there any conflicted item as well
    let matchedWithSalesItems = [];
    bookedItems.map((bookedItem) => {
      sales_item_array.map((salesItem) => {
        if (bookedItem === salesItem.item_imei) {
          matchedWithSalesItems.push(salesItem);
        }
      });
    });

    // if any duplicate items
    if (duplicateItems.length > 0) {
      alert("Duplicate Items: " + duplicateItems.join(", "));
      return;
    }
    // if added items are not all same as sales items
    if (
      sales_item_array.length !== matchedWithSalesItems.length ||
      sales_item_array.length !== imeiFields.length
    ) {
      alert("All required sales items must be scanned and match before booking DPD.");
      return;
    } else {
      allConditionsValid = true;
    }

    if (!allConditionsValid) {
      return;
    }

    // Get the PO reference from the input field
    let poRef = $("input[name='po_box']").val();

    if (!poRef) {
      alert("PO Reference is required to book DPD shipment.");
      return;
    }

    // Confirm with user before proceeding
    if (!confirm("Are you sure you want to book this shipment with DPD?")) {
      return;
    }
    
    // Automatically save all scanned items
    saveAllScannedItems();
    
    // Show loading indicator
    $(".page-loader").show();
    
    // Disable the button to prevent multiple clicks
    $(".book-dpd-bm").prop("disabled", true);
    
    // Call the PHP script to handle DPD booking and BackMarket update
    $.ajax({
      type: "POST",
      url: "includes/book_dpd_and_update_bm.php",
      data: {
        po_ref: poRef,
        dpd_only: 1
      },
      success: function(response) {
        $(".page-loader").hide();
        $(".book-dpd-bm").prop("disabled", false);
        try {
          let result = JSON.parse(response);
          if (result.success) {
            // Update the delivery company and tracking number fields
            $("#delivery_company").val("DPD");
            $("input[name='tracking_no']").val(result.tracking_number);
            
            // Show success message
            let message = "DPD booking completed successfully. Tracking number: " + result.tracking_number;
            if (result.dpd_only) {
              message += "\n\nNext step: Go to the order details page and click Update BM.";
            }
            alert(message);
          } else {
            alert("Error: " + result.message);
          }
        } catch (e) {
          console.error("Error parsing response:", e);
          console.error("Response was:", response);
          alert("An error occurred while processing the request. Please check the logs.");
        }
      },
      error: function(xhr, status, error) {
        $(".page-loader").hide();
        $(".book-dpd-bm").prop("disabled", false);
        console.error("AJAX Error:", error);
        console.error("Response:", xhr.responseText);
        alert("An error occurred while processing the request. Please check the logs.");
      }
    });
  });

  let formSubmittedCount = 1;
  $(document).on("click", ".submit-form", function (e) {
    let inputsValidated = true; //default

    // check customer
    let customer = document.querySelector(".order_customer");
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
      
      // Disable the "Book DPD and update BM" button to prevent multiple shipments
      $(".book-dpd-bm").prop("disabled", true).hide();
      
      // Also hide the booking completed button to prevent further changes
      $(".booking-completed").prop("disabled", true).hide();
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
    format: "yyyy/mm/dd",
  });

  // calculate total items
  function updateTotalItems() {
    let t = $(".imei-field").length;
    $(".total_items").html(t);
  }

  // duplicate audio
  function playErrorSound(audioType) {
    try {
      let audioElement;
      
      // Try to find the appropriate audio element
      switch(audioType) {
        case 'duplicate':
          audioElement = document.querySelector("#duplicate-beep");
          break;
        case 'outofstock':
          audioElement = document.querySelector("#outofstock-beep");
          break;
        default:
          // Fallback to any available audio element
          audioElement = document.querySelector("#duplicate-beep") || 
                        document.querySelector("#outofstock-beep") || 
                        document.querySelector("#myAudio");
      }
      
      // If no audio element exists, create one
      if (!audioElement) {
        audioElement = document.createElement('audio');
        audioElement.src = '../../error-beep.mp3'; // Use a default path
        document.body.appendChild(audioElement);
      }
      
      // Play the sound
      audioElement.currentTime = 0;
      return audioElement.play().catch(error => {
        console.warn("Error playing sound:", error);
      });
    } catch (e) {
      console.error("Error in playErrorSound:", e);
    }
  }

  let duplicateBeep = document.querySelector("#duplicate-beep");
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
        item.item_color &&
        item.item_details &&
        item.item_gb &&
        item.item_grade &&
        item.item_supplier &&
        item.item_tray
      ) {
        return `${
          item.item_brand +
          item.item_color +
          item.item_details +
          item.item_gb +
          item.item_grade +
          item.item_supplier +
          item.item_tray
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
        item.item_color &&
        item.item_details &&
        item.item_gb &&
        item.item_grade &&
        item.item_supplier &&
        item.item_tray
      ) {
        return `${
          item.item_brand +
          item.item_color +
          item.item_details +
          item.item_gb +
          item.item_grade +
          item.item_supplier +
          item.item_tray
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
        item_color,
        item_gb,
        item_grade,
        item_tray,
        qty,
        item_supplier,
      } = item;

      // console.log(item);
      // get inserted qty of this item
      let insertedQty = 0;
      if (groupInsertedItems.length > 0) {
        insertedQty = groupInsertedItems.find((inserted) => {
          return (
            inserted.item_brand === item_brand &&
            inserted.item_details === item_details &&
            inserted.item_color === item_color &&
            inserted.item_gb === item_gb &&
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
          ${findBrand(
            item_brand
          )} ${item_details} ${item_color} ${item_gb}GB ${findGrade(
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

  // SAVE ITEMS
  // save all scanned items
  const saveBtn = D["querySelector"](".save_btn");
  saveBtn.addEventListener("click", saveAllScannedItems);

  function saveAllScannedItems() {
    let allItems = Array.apply(null, D["querySelectorAll"](".imei-field")).map(
      (item) => item.value
    );

    // remove empty indexes if any
    allItems = allItems.filter((item) => (item.length ? item : null));

    if (allItems.length) {
      localStorage.setItem(
        `imei-sales-order-${sales_order_id}`,
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
    `imei-sales-order-${sales_order_id}`
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
      `imei-sales-order-${sales_order_id}`
    );
    // if saved items are available
    if (isDataAvailable) {
      const reScan = JSON.parse(isDataAvailable);

      // flush whole table first
      $("#items_table").find("tbody").html("");

      reScan.forEach((imei) => {
        // Create new row and get focus on imei text box
        addNewRow();

        // get last row index, select last row textbox and apply validateDetails function on it
        const allIMEI = D["querySelectorAll"](".imei-field");
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
