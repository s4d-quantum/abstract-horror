// Beep audio
let x = document.querySelector("#myAudio");

// Add new row
let GBs = $('.gb-field').html(),
    rowId = 2;

// Add new row
function addNewRow() {
    var options = $('.brand-field').html().trim(),
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
        <input type='text' class='form-control grade-field' name='grade_field[]' >
    </td>
    <td>
        <input type="text" class="form-control brand-field" name="brand_field[]">
    </td>
    <td>
        <input type="text" class="form-control gb-field" name="gb_field[]">
    </td>
    <td>
        <button class="del_row btn btn-danger"><i class="fa fa-close"></i></button>  
    </td>
    </tr>`;
    rowId++;

    $('#items_table')
        .find('tbody')
        .append(newRow)
        .children()
        .insertBefore('.add-new-row');

    // assign focusout to imei box
    imeiFields = document.getElementsByClassName('imei-field');
    imeiFields[imeiFields.length - 1].focus();
} //add new row ended

// get gb
var gbField = [];
$('.gb-field').children().each((i, item) => {
    gbField.push({
        title: item.innerHTML.trim(),
        value: item.value
    });
});

// get grades
var gradeField = [];
$('.grade-field').children().each((i, item) => {
    gradeField.push({
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
    // IMEI input
    const input = that.value;

    // CHECK INPUT LENGTH
    if (input.length >= 15 && input.length <= 16) {

        // All input values, to check if same imei added twice
        let allInputValues = [...document.querySelectorAll('body .imei-field')].filter(item => {
            return item.value === input;
        });

        // if same imeis are added twice
        if (allInputValues.length > 1) {
            $(that).parent().removeClass('has-success').removeClass('has-warning').addClass('has-error');
            $(that).siblings('.help-block').html('Duplicate IMEI');
            $('.add_row').attr('disabled', 'true');
            $('.submit-form').attr('disabled', 'true');
            x.play(); //error beep
            that.value = "";
            return 0;
        }
        // If IMEI are unique
        else {
            $.ajax({
                'type': "POST",
                'url': "includes/fetch_purchase_return_imei.php",
                'data': {
                    item_imei: input,
                    supplier: document.querySelector('.supplier_id').textContent.trim()
                },
                'success': function (data) {
                    const stock = JSON.parse(data)[0];

                    // IF STOCK NOT AVAILABLE
                    if (!stock) {
                        playErrorSound(); // Add this
                        $(that).parent().removeClass('has-success').removeClass('has-warning').addClass('has-error');
                        $(that).siblings('.help-block').html('Out of stock');
                        $('.add_row').attr('disabled', 'true');
                        $('.submit-form').attr('disabled', 'true');
                        $(that).val("");
                    }

                    // IF IMEI IS AVAILABLE FOR SALE   
                    else {
                        $(that).parent().removeClass('has-warning').removeClass('has-error').addClass('has-success');
                        $(that).siblings('.help-block').html('Available!');
                        $('.add_row').removeAttr('disabled');
                        $('.submit-form').removeAttr('disabled');

                        // filling rest of fields
                        $(that).parent().parent().siblings()
                            .children('.details-field')
                            .val(stock.item_details);

                        $(that).parent().parent().siblings()
                            .children('.color-field')
                            .val(stock.item_color);

                        // item gb
                        if (parseInt(stock.item_grade) > 0) {
                          var findgrade = gradeField.filter(item => {
                            return stock.item_grade == item.value;
                          });
                        $(that).parent().parent().siblings()
                            .children('.grade-field')
                            .val(findgrade[0].title);
                        }
                        else{
                        $(that).parent().parent().siblings()
                            .children('.grade-field')
                            .val('');
                        }
                        // item grade


                        $(that).parent().parent().siblings()
                            .children('.brand-field')
                            .val(stock.title);

                        $(that).parent().parent().siblings()
                            .children('.gb-field')
                            .val(stock.item_gb);

                        }//else ended
                },//success ended
                'error': function (error) {
                    console.log(error);
                }
            }); //ajax ended
            return 1;

        }//else ended
    }//length else ended
    else {
        // error messages
        $(that).parent().removeClass('has-success').removeClass('has-warning').addClass('has-error');
        $(that).siblings('.help-block').html('16 or 15 digits required');
        $('.add_row').attr('disabled', 'true');
        $('.submit-form').attr('disabled', 'true');
        x.play(); //error beep
        return 0;
    }
} //validate details ended


// date picker
$('#purchase_date').datepicker({
    autoclose: true,
    format: 'yyyy/mm/dd'
});

// Barcode input on IMEI field
$(document).on('keypress', '.imei-field', processKey);
function processKey(event) {
    if (event.keyCode === 13) {
        event.preventDefault();
        let na = validateDetails.call(this);
        if(na){
            addNewRow();
        }
    }
}
$(document).on('blur', '.imei-field', function(){
    validateDetails.call(this);
});


// show/hide booking/submit button
// ==========
// Booking validtion
// ==========
$('.submit-form').hide();
$('.booking-completed').on('click', function (e) {
    e.preventDefault();
    $(this).hide();
    $('.submit-form').show();
});

let formSubmittedCount = 1;
$(document).on('click','.submit-form',function(e){
  let inputsValidated = true; //default

  // check date
  let date = document.querySelector('.purchase_date');
  // check IMEIs
  let imei = document.querySelectorAll('.imei-field');
  let checkImei = Array.prototype.filter.call(imei, (item)=>item.value.length <= 0);

  // check date
  if(date.value.length <= 0) {
    inputsValidated = false;
    alert('date is missing!');
  }

  // check IMEIs
  else if(checkImei.length > 0) {
    inputsValidated = false;
    alert('imei missing')
  }

  if(inputsValidated && formSubmittedCount == 1){
    formSubmittedCount++;
  }
  else if(!inputsValidated || formSubmittedCount > 1){
    console.log(`Form submitted ${formSubmittedCount} times!`);
    $(this).attr('disable','disable');
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
        $('.submit-form').removeAttr('disabled','true');
    }
})
