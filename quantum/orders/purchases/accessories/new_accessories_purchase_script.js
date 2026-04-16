// Beep audio
let x = document.querySelector("#myAudio");

var selected_items = [];
var new_item_field = "";

// Add new row
function addNewRow() {
    categories = document.querySelector('.brand-field').innerHTML;
    new_item_field +=
    `<tr>
        <td>
            <select class='brand-field form-control' required name='item_brand[]'> 
            ${categories} </select>        
        </td>
        <td>
            <select class='code-field form-control' required name='item_code[]'>
                <option value="">Select</option>
            </select>        
        </td>
        <td><input type='number' class='item_qty form-control'placeholder="Item qty"  name='item_qty[]'></td>        
        <td>
            <button class="del_row btn btn-danger"><i class="fa fa-close"></i></button>  
        </td>
   </tr>`;

   $('#purchase_items')
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
        $('#submit_purchase').addClass('disabled');
        this.value = "";
        x.play(); //error beep
        return null;
    }
    else {
        // console.log('else');
        $(this).parent().removeClass('has-success').removeClass('has-warning').removeClass('has-error');
        $(this).siblings('.help-block').html('');
        $('.add_row').removeAttr('disabled');
        $('#submit_purchase').removeClass('disabled');
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

  // check supplier
  let supplier = document.querySelector('.purchase_supplier');
    console.log(supplier);
  // check Tray
  let tray = document.querySelector('.tray_id');
  // check brands
  let brand = document.querySelectorAll('.brand-field');
  let checkbrand = Array.prototype.filter.call(brand, (item)=>item.value.length <= 0);
  // check codes
  let code = document.querySelectorAll('.code-field');
  let checkcode = Array.prototype.filter.call(code, (item)=>item.value.length <= 0);
  // check itemqtys
  let itemqty = document.querySelectorAll('.item_qty');
  let checkitemqty = Array.prototype.filter.call(itemqty, (item)=>parseInt(item.value) <= 0 || item.value.length <= 0);

  // check supplier
  if(supplier.value.length <= 0) {
    inputsValidated = false;
    alert('supplier is missing!');
  }

  // check Tray
  else if(tray.value.length <= 0){
    inputsValidated = false;
    alert('Tray missing!')
  }
  
  // check codes
  else if(checkcode.length > 0) {
    inputsValidated = false;
    alert('code missing')
  }

  // check brands
  else if(checkbrand.length > 0) {
    inputsValidated = false;
    alert('brand missing')
  }

  // check item qty
  else if(checkitemqty.length > 0) {
    inputsValidated = false;
    alert('Item Qty is invalid or missing!')
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

// scan and search tray
$('.tray_id').on('focusout', function () {
    console.log('asdsd');
    let trays = [...document.querySelectorAll('.tray_collection option')];
    let validTray = trays.find(tray => {
        return this.value === tray.value;
    })
    if (!validTray) {
        $(this).parent().removeClass('has-success').addClass('has-error');
        $(this).siblings('.help-block').html('Tray not identified!');
        // $('.submit-form').attr('disabled','true')
    }
    else {
        $(this).parent().removeClass('has-error').addClass('has-success');
        $(this).siblings('.help-block').html('Tray Identified');
        // $('.submit-form').removeAttr('disabled')
    }
});
