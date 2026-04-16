var selected_items = [];
var new_item_field = "";

// Add new row
function addNewRow() {
    categories = document.querySelector('.brand-field').innerHTML;
    new_item_field +=
    `<tr>
        <td>
            <select class='brand-field form-control' required name='item_brand[]'> 
                ${categories} 
            </select>        
        </td>
        <td>
            <select class='code-field form-control' required name='item_code[]'>
                <option value="">Select</option>
            </select>        
        </td>
        <td>
            <div class="form-group">
                <input type="number" name="item_qty[]"  
                placeholder="Item qty" class="item_qty form-control"
                required>
                <p style="font-size:13px;" class="available_items">Available Qty: 
                <span>0</span></p>
            </div>
        </td>        
        <td>
            <button class="del_row btn btn-danger"><i class="fa fa-close"></i></button>  
        </td>
   </tr>`;

   $('#order_items')
        .find('tbody')
        .append(new_item_field)
        .children()
        .insertBefore('.add_new_row');
    new_item_field = "";
    
    // assign focusout to imei box
    // imeiFields = document.getElementsByClassName('item_code');
    // imeiFields[imeiFields.length - 1].focus();
} //add new row ended

// disable btn by default
function validateDetails() {
    // All input values, to check if same imei added twice
    let allInputValues = [...document.getElementsByClassName('item_code')].filter(input => {
        return input.value === this.value;
    });

    // if same item codes are added twice
    if (allInputValues.length > 1) {
        // console.log('if');
        $(this).parent().removeClass('has-success').removeClass('has-warning').addClass('has-error');
        $(this).siblings('.help-block').html('Duplicate');
        $('.add_row').attr('disabled', 'true');
        $('#submit_order').addClass('disabled');
        this.value = "";
        duplicateBeep.play(); //error beep
        return null;
    }
    else {
        // console.log('else');
        $(this).parent().removeClass('has-success').removeClass('has-warning').removeClass('has-error');
        $(this).siblings('.help-block').html('');
        $('.add_row').removeAttr('disabled');
        $('#submit_order').removeClass('disabled');
        return 1;
    }
}


// Barcode input on IMEI field
$(document).on('keypress', '.item_code', processKey);
function processKey(event) {
    if (event.keyCode === 13) {
        event.preventDefault();
        // console.log('enter');
        let na = validateDetails.call(this);
        if (na) {
            addNewRow();
        }
    }
}
$(document).on('blur', '.item_code', function () {
    validateDetails.call(this);
});


// disable enter key
$(document).keypress(
    function (event) {
        let isItemFocused = document.activeElement.className.indexOf('item-field'); //find if item field focused
        if (event.which == '13' && isItemFocused === -1) {
            // console.log('enter');
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
$('.submit-form').hide();
$('.booking-completed').on('click', function (e) {
    e.preventDefault();
    $(this).hide();
    $('.submit-form').show();
});
let formSubmittedCount = 1;
$(document).on('click','.submit-form',function(e){
  let inputsValidated = true; //default

  // check customer
  let customer = document.querySelector('.order_customer');
  console.log(customer);
  // check brands
  let brand = document.querySelectorAll('.brand-field');
  let checkbrand = Array.prototype.filter.call(brand, (item)=>item.value.length <= 0);
  console.log(checkbrand);
  // check codes
  let code = document.querySelectorAll('.code-field');
  let checkcode = Array.prototype.filter.call(code, (item)=>item.value.length <= 0);
  
    // check boxes
    let boxes = document.querySelector('.total_boxes');

    // check pallets
    let pallets = document.querySelector('.total_pallets');

    // check box
    if(parseInt(boxes.value) < 0 || isNaN(parseInt(boxes.value))) {
        inputsValidated = false;
        alert('Add Boxes!');
    }

    // check pallet
    else if(parseInt(pallets.value) < 0 || isNaN(parseInt(pallets.value))) {
        inputsValidated = false;
        alert('Add pallets!');
    }

    // check customer
    else if(customer.value.length <= 0) {
        inputsValidated = false;
        alert('customer is missing!');
    }  

    // check brands
    else if(checkbrand.length > 0) {
        inputsValidated = false;
        alert('Category missing')
    }

    // check codes
    else if(checkcode.length > 0) {
        inputsValidated = false;
        alert('Brand missing')
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
        $('.submit-form').removeClass('disabled');
    }
});

$(document).on('change', '.brand-field', selectBrandsItems);
function selectBrandsItems(){
    let that = this;
    $.ajax({
        'type': "POST",
        'url': "includes/fetch_brand_items.php",
        'data': {
            brandId:that.value
        },
        'success': function (data) { 
            // first clear existing dropdown
            $(that)
                .parent()
                .siblings()
                .find('.code-field')
                .html("");

            $(that)
                .parent()
                .siblings()
                .find('.code-field')
                .append("<option value=''>select</option>");

            let items = JSON.parse(data);
            console.log(data);
            if(items.length > 0){
                items.forEach(item => {
                    let itemId = item.id;
                    let itemCode = item.title.trim();
                    $(that)
                        .parent()
                        .siblings()
                            .find('.code-field')
                            .append(`<option value="${itemId}">${itemCode}</option>`)
                });
            }
        },
        'error': function (data) { }
    });
}


// duplicate audio
let duplicateBeep = document.querySelector("#duplicate-beep");

// outofstock audio
let outOfStock = document.querySelector("#outofstock-beep");
