// Beep audio
let x = document.querySelector("#myAudio");

var brands = [];
var new_item_code = "";

// add new row
$('.add_new_row').on('click',function(){
    addNewRow();
});

// get brands
$('.brands').children().each((i, item) => {
    brands.push({
        title: item.innerHTML.trim(),
        value: item.value
    });
});

// add new row started
function addNewRow() {
    new_item_code +=
        newRow = `
    <tr>
        <td>
            <div class="form-group">
                <input type="text" name="item_code[]" placeholder="Item code" class="form-control 
        item_code" required >
                <span class="help-block"></span>
            </div>
        </td>
        <td>
            <input type="text" name="item_brand[]" placeholder="Item qty" 
            class="form-control item_brand">
        </td>
        <td>
            <input type="number" name="item_qty[]"  placeholder="Item qty" 
            class="form-control item_qty">
            Available: <span class="available_qty"></span>
        </td>
        <td>
            <input type="text" name="item_details[]"  placeholder="Item details" 
            class="form-control item_details">
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

// disbale btn by default
$('.add_row').attr('disabled', 'true');
$('.submit_order').attr('disabled', 'true');

function validateDetails() {

    // Check if same item added twice
    let allInputValues = [];
    let codes = document.getElementsByClassName('item_code');
    for(let i=0;i<codes.length;i++){
        if(codes[i].value === this.value){
            allInputValues.push(codes[i]);
        }
    }
    // console.log(allInputValues.length);

    // if same items are added twice
    if (allInputValues.length > 1) {
        console.log('if');
        $(this).parent().removeClass('has-success').removeClass('has-warning').addClass('has-error');
        $(this).siblings('.help-block').html('Duplicate');
        $('.add_row').attr('disabled', 'true');
        $('.submit_order').attr('disabled', 'true');
        this.value = "";
        x.play(); //error beep
        return null;
    }
    // If items are all unique
    else{
        $('.add_row').removeAttr('disabled');
        $('.submit_order').removeAttr('disabled');

        console.log('else');
        let $that = $(this);
        const input = this.value;

        $.ajax({
            'type': "POST",
            'url': "includes/fetch_non_imei_order.php",
            'data': {
                item_code: input
            },
            'success': function (data) {

                let stock = JSON.parse(data);

                if (stock !== null) {
                    // available
                    $that.parent().removeClass('has-error').removeClass('has-warning').addClass('has-success');
                    $that.siblings('.help-block').html('Available');
                    $('.add_row').removeAttr('disabled');
                    $('.submit_order').removeAttr('disabled');

                    // item qty
                    $that.parent().parent().siblings()
                        .find('.item_qty').val(stock.item_qty);
                    $that.parent().parent().siblings()
                        .find('.available_qty').html(stock.item_qty);

                    // item brand
                    let findBrand = brands.filter(item => {
                        return stock.item_brand === item.value;
                    });
                    $that.parent().parent().siblings()
                        .find('.item_brand')
                        .val(findBrand[0].title);

                    // item details
                    $that.parent().parent().siblings()
                        .find('.item_details')
                        .val(stock.item_details);

                }
                else {
                    //item not available
                    $that.parent().removeClass('has-success').removeClass('has-warning').addClass('has-error');
                    $that.siblings('.help-block').html('Not Available');
                    $('.add_row').attr('disabled', 'true')
                    $('.submit_order').attr('disabled', 'true')
                }

            }
        });
        return 1;
    }

} //focusout ended


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
    // console.log('blur');
    validateDetails.call(this);
});


// show/hide booking/submit button
$('.submit_order').hide();
$('.booking-completed').on('click', function (e) {
    e.preventDefault();
    $(this).hide();
    $('.submit_order').show();
});


// IF item qty added more then avaialble qty
$(document).on('keyup', '.item_qty', function () {
    console.log('writing')
    let availableQty = parseInt($(this).siblings().html());
    if (this.value > availableQty) {
        $(this).parent().addClass('has-error');
        $(this).siblings('.help-block').html('Not Available');
        $('.add_row').attr('disabled', 'true')
        $('.submit_order').attr('disabled', 'true')
    }
    else {
        $(this).parent().removeClass('has-error');
        $(this).siblings('.help-block').html('Not Available');
        $('.add_row').removeAttr('disabled')
        $('.submit_order').removeAttr('disabled')
    }
});

// disable enter key
// $(document).keypress(
//     function (event) {
//         let isItemFocused = document.activeElement.className.indexOf('item-field'); //find if item field focused
//         if (event.which == '13' && isItemFocused === -1) {
//             // console.log("enter");
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
$('.submit_order').on('click', function (e) {
    if ($('#order_items tbody tr').length <= 0) {
        alert("No item selected!");
        e.preventDefault();
    }
});

// remove row
$(document).on('click', '.del_row', function (e) {
    e.preventDefault();
    $(this).parent().parent().remove();
    console.log($('.has-error').length);
    if ($('.has-error').length < 1) {
        $('.add_row').removeAttr('disabled');
        $('.submit_order').removeAttr('disabled');
    }
})
