
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
    new_item_code +=
    `<tr>
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
            <p class="item_qty_label"><?php echo ''; ?></p>
            <input type="number" name="item_qty[]"  placeholder="Item qty"
            class="form-control item_qty hidden">
        </td>
        <td>
            <input type="text" name="item_details[]"  placeholder="Item details"
            class="form-control item_details">
        </td>
        <td>
            <button class="del_row btn btn-danger"><i class="fa fa-close"></i></button>
        </td>
    </tr>`;

    $('#confirm_order').find('tbody')
        .append(new_item_code)
        .children()
        .insertBefore('.add_new_row');
        new_item_code = "";

    // assign focusout to item box
    itemFields = document.getElementsByClassName('item_code');
    itemFields[itemFields.length - 1].focus();

} // add new row ended

// disbale btn by default
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
        return null;
    }
    // If items are all unique
    else {
        let $that = $(this);

        $.ajax({
            'type': "POST",
            'url': "includes/fetch_non_imei_order_return.php",
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
                    $('#submit_order').removeAttr('disabled');

                    // item details
                    $that.parent().parent().siblings()
                        .find('.item_details')
                        .val(stock.item_details);

                    // item qty
                    $that.parent().parent().siblings()
                        .find('.item_qty').val(stock.item_qty);
                    $that.parent().parent().siblings()
                        .find('.item_qty_label').html(stock.item_qty);

                    // item brand
                    let findBrand = brands.filter(item => {
                        return stock.item_brand === item.value;
                    });
                    $that.parent().parent().siblings()
                        .find('.item_brand')
                        .val(findBrand[0].title);

                }
                else {
                    //item not available
                    $that.parent().removeClass('has-success').removeClass('has-warning').addClass('has-error');
                    $that.siblings('.help-block').html('Not Available');
                    $('.add_row').attr('disabled', 'true')
                    $('#submit_order').attr('disabled', 'true')
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
        if (na) {
            addNewRow();
        }
    }
}
$(document).on('blur', '.item_code', function () {
    validateDetails.call(this);
});


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
    if ($('#confirm_order tbody tr').length <= 0) {
        alert("No item selected!");
        e.preventDefault();
    }
});


// show/hide booking/submit button
$('.submit-form').hide();
$('.booking-completed').on('click', function (e) {
    e.preventDefault();
    $(this).hide();
    $('.submit-form').show();
});

// remove row
$(document).on('click', '.del_row', function (e) {
    e.preventDefault();
    $(this).parent().parent().remove();
    if ($('.has-error').length < 1) {
        $('.add_row').removeAttr('disabled');
        $('.submit-form').removeAttr('disabled');
    }
})
