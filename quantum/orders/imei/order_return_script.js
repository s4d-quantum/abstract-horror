var imeiFields = 0;
function addNewRow() {
    const trayOptions = $('.tray_collection').html().trim(),
    newRow = `<tr>
        <td>
          <div class='form-group'>
            <input type='text' class='form-control imei-field' name='imei_field[]' required>
            <span class='help-block'></span>
          </div>
        </td>
        <td>
          <input type='text' class='form-control details-field' name='details_field[]' >
          <input type='text' class='hide form-control order_id' name='order_id[]'>
        </td>
        <td>
          <input type='text' class='form-control brand-field' name='brand_field[]'>
        </td>
        <td>
            <input type="text" class="form-control color-field" name="color_field[]">
        </td>
        <td>
          <input type='text' class='form-control gb-field' name='gb_field[]'>
        </td>
        <td>
            <select class='form-control tray-field' name='tray_field[]' >
                ${trayOptions}
            </select>
        </td>
        <td>
          <button class="del_row btn btn-danger"><i class="fa fa-close"></i></button>  
        </td>
      </tr>`;

    $('#items_table')
        .find('tbody')
        .append(newRow)
        .children()
        .insertBefore('.add-new-row');

    // assign focusout to imei box
    imeiFields = document.getElementsByClassName('imei-field');
    imeiFields[imeiFields.length - 1].focus();
}

// disable btn by default
$('.add_row').attr('disabled', 'true');


// get gb
var gbField = [];
$('.gb-field').children().each((i, item) => {
    gbField.push({
        title: item.innerHTML.trim(),
        value: item.value
    });
});

// get brands
var brandField = [];
$('.brand-field').children().each((i, item) => {
    brandField.push({
        title: item.innerHTML.trim(),
        value: item.value
    });
});

// IMEI focus out
function validateDetails() {

    var that = this;
    const input = that.value;

    if (input.length > 16 || input.length < 15) {
        // error messages
        $(that).parent().removeClass('has-success').removeClass('has-warning').addClass('has-error');
        $(that).siblings('.help-block').html('16 digits required');
        $('.add_row').attr('disabled', 'true')
        duplicateBeep.play(); //error beep
        return 0;
    }
    else{

        // All input values, to check if same imei added twice
        let allInputValues = [...document.getElementsByClassName('imei-field')].filter(input => {
            return input.value === this.value;
        });

        // if same imeis are added twice
        if (allInputValues.length > 1) {
            $(that).parent().removeClass('has-success').removeClass('has-warning').addClass('has-error');
            $(that).siblings('.help-block').html('Duplicate IMEI');
            $('.add_row').attr('disabled', 'true');
            this.value = "";
            duplicateBeep.play(); //error beep
            return 0;
         }

        else {

            $.ajax({
                'type': "POST",
                'url': "includes/fetch_order_return_imei.php",
                'data': {
                    item_imei: input,
                    customer: document.querySelector('.customer_id').textContent.trim()
                },
                'success': function (data) {
                    const stock = JSON.parse(data);
                    console.log(stock);

                    // IF STOCK NOT AVAILABLE
                    if (!stock) {
                        $(that).parent().removeClass('has-success').removeClass('has-warning').addClass('has-error');
                        $(that).siblings('.help-block').html('Out of stock');
                        $('.add_row').attr('disabled', 'true');
                        $(that).val("");
                        outOfStock.play();
                    }
                    else{
                        $(that).parent().removeClass('has-warning').removeClass('has-error').addClass('has-success');
                        $(that).siblings('.help-block').html('Available!');
                        $('.add_row').removeAttr('disabled');

                        // filling rest of fields
                        $(that).parent().parent().siblings()
                            .children('.details-field')
                            .val(stock.item_details);

                        $(that).parent().parent().siblings()
                            .children('.brand-field')
                            .val(stock.title);

                        $(that).parent().parent().siblings()
                            .children('.color-field')
                            .val(stock.item_color);

                        $(that).parent().parent().siblings()
                            .children('.gb-field')
                            .val(stock.item_gb);

                        // copy last row Tray ID
                        // Tray ID code 
                        let siblings = $(that).parent().parent().siblings();
                        let anyLastRow = [...document.querySelectorAll('.imei-field')].map(row => {
                            return row;
                        });
                        anyLastRow = anyLastRow[anyLastRow.length - 3];
                        anyLastRow = $(anyLastRow).parent().parent().siblings();
                        console.log(siblings);
                    
                        let lastRowState = {
                            tray: anyLastRow.children('.tray-field').val()
                        };     

                        // item tray
                        let lastTray = lastRowState.tray;
                        $(siblings)
                            .children('.tray-field').children()
                            .each((i, option) => {
                            if (option.value === lastTray) {
                                $(option).attr('selected', 'selected');
                            } else {
                                $(option).removeAttr('selected');
                            }
                        });
                        // Tray ID code ended
                        
                    }
                }//success ended
            });
            return 1;
        }
    }

}

// Barcode input on IMEI field
$(document).on('keypress', '.imei-field', processKey);
function processKey(event) {
    if (event.keyCode === 13) {
        event.preventDefault();
        let na = validateDetails.call(this);
        if (na) {
            addNewRow();
        }
    }
}
$(document).on('blur', '.imei-field', function () {
    validateDetails.call(this);
});


// ==========
// Booking validtion
// ==========
// show/hide booking/submit button
$('.submit-form').hide();
$('.booking-completed').on('click', function (e) {
    e.preventDefault();
    $(this).hide();
    $('.submit-form').show();
});

let formSubmittedCount = 1;
$(document).on('click','.submit-form',function(e){
  let inputsValidated = true; //default

  // check IMEIs
  let imei = document.querySelectorAll('.imei-field');
  let checkImei = Array.prototype.filter.call(imei, (item)=>item.value.length <= 0);

  // check IMEIs
  if(checkImei.length > 0) {
    inputsValidated = false;
    alert('imei missing')
  }

  if(inputsValidated && formSubmittedCount == 1){
    formSubmittedCount++;
  }
  else if(!inputsValidated || formSubmittedCount > 1){
    console.log(`Form submitted ${formSubmittedCount} times!`);
  //   $(this).attr('disabled','disabled');
    e.preventDefault();
  }
})
// ==========
// Booking validtion
// ==========


// add new row button
$('.add_row').on('click', function (e) {
    e.preventDefault();
    addNewRow();
})

// remove row
$(document).on('click', '.del_row', function (e) {
    e.preventDefault();
    $(this).parent().parent().remove();
    if ($('.has-error').length < 1) {
        $('.add_row').removeAttr('disabled');
    }
})

// duplicate audio
let duplicateBeep = document.querySelector("#duplicate-beep");

// outofstock audio
let outOfStock = document.querySelector("#outofstock-beep");
