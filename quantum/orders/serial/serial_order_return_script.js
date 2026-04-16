var brands = [];
var new_item_code = "";

// get brands
$('.brands').children().each((i, item) => {
    brands.push({
        title: item.innerHTML.trim(),
        value: item.value
    });
});

// add new row started
function addNewRow() {
    const trayOptions = $('.tray_collection').html().trim();
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
            <input type="number" name="item_brand[]" placeholder="Item Brand" 
            class="form-control item_brand">
        </td>

        <td><input  class='item_details form-control' placeholder="Item details" 
        type='text' name='item_details[]'></td>

        <td>
            <select class='form-control tray-field' name='tray_field[]' >
                ${trayOptions}
            </select>
        </td>
        
        <td>
            <button class="del_row btn btn-danger"><i class="fa fa-close"></i></button>  
        </td>
    </tr>`;

    $('#order_items').find('tbody')
        .append(new_item_code)
        .children()
        .insertBefore('.add_new_row');
    new_item_code = "";

    // assign focusout to item box
    itemFields = document.getElementsByClassName('item_code');
    itemFields[itemFields.length - 1].focus();

} // add new row ended


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
        this.value = "";
        duplicateBeep.play(); //error beep
        return 0;
    }
    // If items are all unique
    else {
        let $that = $(this);

        $.ajax({
            'type': "POST",
            'url': "includes/fetch_serial_order_return.php",
            'data': {
                item_code: input,
                customer: document.querySelector('.customer_id').textContent.trim()
            },
            'success': function (data) {

                let stock = JSON.parse(data);

                console.log(data);

                if (stock !== null) {
                    // available
                    $that.parent().removeClass('has-error').removeClass('has-warning').addClass('has-success');
                    $that.siblings('.help-block').html('Available');
                    $('.add_row').removeAttr('disabled');

                    // item details
                    $that.parent().parent().siblings()
                        .find('.item_details')
                        .val(stock.item_details);

                    // item brand
                    let findBrand = brands.filter(item => {
                        return stock.item_brand === item.value;
                    });
                    $that.parent().parent().siblings()
                        .find('.item_brand')
                        .val(findBrand[0].title);

                        
                    // copy last row Tray ID
                    // Tray ID code 
                    let siblings = $that.parent().parent().siblings();
                    let anyLastRow = [...document.querySelectorAll('.item_code')].map(row => {
                        return row;
                    });
                    anyLastRow = anyLastRow[anyLastRow.length - 3];
                    anyLastRow = $(anyLastRow).parent().parent().siblings();
                    console.log(siblings);
                    console.log(anyLastRow);

                    let lastRowState = {
                        tray: anyLastRow.children('.tray-field').val()
                    };      

                    // item tray
                    console.log(lastRowState.tray)
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
                else {
                    //item not available
                    $that.parent().removeClass('has-success').removeClass('has-warning').addClass('has-error');
                    $that.siblings('.help-block').html('Not Available');
                    $('.add_row').attr('disabled', 'true');
                    outOfStock.play(); //error beep
                    $that.val('');
                    return 0;
                }
            }
        });
        return 1;
    }

} //focusout ended


// Barcode input on item field
$(document).on('keypress', '.item_code', processKey);
function processKey(event) {
    if (event.keyCode === 13) {
        event.preventDefault();
        let na = validateDetails.call(this);
        console.log(na);
        if (na) {
            console.log('new row');
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
$('.booking-completed').on('click', function (e) {
    e.preventDefault();
    $(this).hide();
    $('.submit-form').show();
});

let formSubmittedCount = 1;
$(document).on('click','.submit-form',function(e){
  let inputsValidated = true; //default

  // check serials
  let serial = document.querySelectorAll('.item_code');
  let checkserial = Array.prototype.filter.call(serial, (item)=>item.value.length <= 0);
  
  // check serials
  if(checkserial.length > 0) {
    inputsValidated = false;
    alert('serial missing')
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
// $(document).keypress(
//     function (event) {
//         let isitemFocused = document.activeElement.className.indexOf('item-field'); //find if item field focused
//         if (event.which == '13' && isitemFocused === -1) {
//             event.preventDefault();
//             addNewRow();
//         }
//     });


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
    }
})


// duplicate audio
let duplicateBeep = document.querySelector("#duplicate-beep");

// outofstock audio
let outOfStock = document.querySelector("#outofstock-beep");
