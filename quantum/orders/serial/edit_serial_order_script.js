var brands = [];
var new_item_code = "";

// get brands
$('.brands').children().each((i, item) => {
    brands.push({
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

// add new row started
function addNewRow() {
    new_item_code +=
        `<tr>
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
        
            <input type = "number" name = "order_return[]"
            class = "hidden" value = "0">
            <input type = "number" name = "status[]"
            class = "hidden" value = "0">

        </td>
        
    </tr>`;

    $('#order_items').find('tbody')
        .append(new_item_code)
        .children()
        .insertBefore('.add_new_row');
    new_item_code = "";

    updateTotalItems();

    // assign focusout to item box
    itemFields = document.getElementsByClassName('item_code');
    itemFields[itemFields.length - 1].focus();

} // add new row ended

// disbale btn by default
// $('.add_row').attr('disabled', 'true');
$('#submit_order').attr('disabled', 'true');

function validateDetails() {

    // INPUT VALUE
    const input = this.value;

    // Check if same item added twice
    let allInputValues = [...document.getElementsByClassName('item_code')].filter(item => {
        return item.value === input;
    });

    // if same items are added twice
    if (allInputValues.length > 1) {
        $(this).parent().removeClass('has-success').removeClass('has-warning').addClass('has-error');
        $(this).siblings('.help-block').html('Duplicate');
        $('.add_row').attr('disabled', 'true');
        $('#submit_order').attr('disabled', 'true');
        this.value = "";
        duplicateBeep.play(); //error beep
        return null;
    }
    // If items are all unique
    else {
        let $that = $(this);

        $.ajax({
            'type': "POST",
            'url': "includes/fetch_serial_order.php",
            'data': {
                item_code: input
            },
            'success': function (data) {

                console.log(data);
                let stock = JSON.parse(data);

                if (stock !== null) {
                    // available
                    $that.parent().removeClass('has-error').removeClass('has-warning').addClass('has-success');
                    $that.siblings('.help-block').html('Available');
                    $('.add_row').removeAttr('disabled');
                    $('#submit_order').removeAttr('disabled');

                    // item details
                    $that.parent().parent().siblings()
                        .find('.item_details')
                        .val(stock.item_details);

                    // item brand
                    $that.parent().parent().siblings()
                        .find('.item_brand')
                        .val(stock.title);

                    // item grade
                    if (parseInt(stock.grade) > 0) {
                        let grade = gradeField.filter((option, i) => {
                            return option.value === stock.grade
                        });
                        $that.parent().parent().siblings()
                            .find('.item_grade')
                            .val(grade[0].title);
                    }

                }
                else {
                    //item not available
                    $that.parent().removeClass('has-success').removeClass('has-warning').addClass('has-error');
                    $that.siblings('.help-block').html('Not Available');
                    $('.add_row').attr('disabled', 'true');
                    $('#submit_order').attr('disabled', 'true');
                    outOfStock.play(); //error beep
                    $that.val("");
                    return null;
                }

            }
        });
    }

} //focusout ended


// Barcode input on item field
$(document).on('keypress', '.item_code', processKey);
function processKey(event) {
    if (event.keyCode === 13) {
        event.preventDefault();
        let na = validateDetails.call(this);
        if (na) {
            addNewRow();
        }
    }
}
$(document).on('blur', '.item_code', function () {
    validateDetails.call(this);
});


// ==========
// Booking validtion
// ==========
// show/hide booking/submit button
$('.submit-form').hide();
$('.booking-completed').on('click',function(e){
  e.preventDefault();

  // validate duplicate items
  let bookedItems = Array.prototype.slice.call(document.querySelectorAll('.item_code')).map(item => item.value),
    duplicateItems = [];

  // check dulicate items
  for(let i=0; i<bookedItems.length; i++){
    for(let j=bookedItems.length-1; j>i; j--){
      if(bookedItems[i]==bookedItems[j]){
        duplicateItems.push(bookedItems[i]);
      }
    }
  }

  // if no duplicate items
  if (duplicateItems.length <= 0) {
    $(this).hide();
    $('.submit-form').show();
  } 
  else{
    alert('Duplciate Items: ' + duplicateItems.join(', '));
  }
});

let formSubmittedCount = 1;
$(document).on('click','.submit-form',function(e){
  let inputsValidated = true; //default

  // check customer
  let customer = document.querySelector('.order_customer');

  // check serials
  let serial = document.querySelectorAll('.item_code');
  let checkserial = Array.prototype.filter.call(serial, (item)=>item.value.length <= 0);

  // check brands
  let brand = document.querySelectorAll('.item_brand');
  let checkbrand = Array.prototype.filter.call(brand, (item)=>item.value.length <= 0);

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
  
  // check serials
  else if(checkserial.length > 0) {
    inputsValidated = false;
    alert('serial missing')
  }

  // check brands
  else if(checkbrand.length > 0) {
    inputsValidated = false;
    alert('brand missing')
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



// disable enter key
$(document).keypress(
    function (event) {
        let isitemFocused = document.activeElement.className.indexOf('item-field'); //find if item field focused
        if (event.which == '13' && isitemFocused === -1) {
            event.preventDefault();
            addNewRow();
        }
    });


$(document).ready(function () {
    $(".select2").select2();
});

///////////////
// SUBMIT FORM
//////////////
$('#submit_order').on('click', function (e) {
    if ($('#order_items tbody tr').length <= 0) {
        alert("No item selected!");
        e.preventDefault();
    }
});

// remove row
$(document).on('click', '.del_row', function (e) {
    e.preventDefault();
    $(this).parent().parent().remove();
    if ($('.has-error').length < 1) {
        $('.add_row').removeAttr('disabled');
        $('.submit-form').removeAttr('disabled');
    }
    updateTotalItems();
});


// disable btn by default  
// $('.add_row').attr('disabled', 'true')
// add new row button
$('.add_row').on('click', function (e) {
    e.preventDefault();
    addNewRow();
})


// calculate total items
function updateTotalItems() {
    let t = $('.item_code').length;
    console.log(t);
    $('.total_items').html(t);
}

// duplicate audio
let duplicateBeep = document.querySelector("#duplicate-beep");

// outofstock audio
let outOfStock = document.querySelector("#outofstock-beep");
