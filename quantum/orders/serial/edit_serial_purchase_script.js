// Beep audio
let x = document.querySelector("#myAudio");

// Add new row
let GBs = $('.gb-field').html(),
    rowId = 2;

// Add new row
function addNewRow() {
    var options = $('.brand-field').html().trim(),
        newRow = `<tr>
        <td class="row-id hide">
        ${rowId}
        </td>
        <td>
            <div class='form-group'>
            <input type='text' class='form-control item-code-field' name='item_code[]' 
            tabindex='1' required>
            <span class='help-block item-code-help-block'></span>
            <svg class="code727 code${rowId}"></svg>
            </div>
        </td>
        <td>
            <select class='form-control brand-field' name='item_brand[]' >
            ${options}
            </select>
        </td>
        <td>
            <input type='text' class='form-control details-field' name='item_details[]' >
        </td>
        <td>
            <button class="del_row btn btn-danger"><i class="fa fa-close"></i></button>  
        </td>
        <td>
            <label class="btn btn-success print_tag">
                <i class="fa fa-print"></i>
            </label>
        </td>
    </tr>`;
    rowId++;

    $('#items_table')
        .find('tbody')
        .append(newRow)
        .children()
        .insertBefore('.add-new-row');

    // assign focusout to imei box
    imeiFields = document.getElementsByClassName('item-code-field');
    imeiFields[imeiFields.length - 1].focus();
} //add new row ended

// scan and search tray
$('.tray_id').on('focusout', function () {
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

// get brands
var brandField = [];
$('.brand-field').children().each((i, item) => {
    brandField.push({
        title: item.innerHTML.trim(),
        value: item.value
    });
});


// validate form
let validateTimer;
$('.verify-form .fa-spin').hide();


/** validatedetails **/
function validateDetails() {
    var $that = $(this);

    // fetch all imei values
    var validImei = []; //array to store 0/1 for imei validity

    // check if imei length is correct
    if ($that.val().length >= 15 && $that.val().length <= 16) {

        // Check if same imei added twice
        let allInputValues = [...document.getElementsByClassName('item-code-field')].filter(input => {
            return input.value === $that.val();
        });

        // if same imeis are added twice
        if (allInputValues.length > 1) {
            $that.parent().removeClass('has-success').removeClass('has-warning').addClass('has-error');
            $that.siblings('.help-block').html('Duplicate IMEI');
            $('.add_row').attr('disabled', 'true');
            $('.submit-form').addClass('disabled');
            x.play(); //error beep
            this.value = "";
            return 0;
        }
        // if unique imei added
        else {
            $('.add_row').removeAttr('disabled');

            // show validate spinner
            $('.verify-form .fa-spin').show();
            // fetch imei data
            let TAC = $that.val().slice(0, 8);
            $.ajax({
                'type': "POST",
                'url': "includes/fetch_edit_imei.php",
                'data': {
                    TAC
                },
                success: function (data) {

                    console.dir(data);

                    // hide validate spinner 
                    let D = JSON.parse(data);

                    // if item_tac is available
                    if (D.item_tac !== null) {

                        // new imei
                        $that.parent().removeClass('has-error').removeClass('has-success').addClass('has-warning');
                        $that.siblings('.help-block').html('Existing TAC');
                        validImei.push(1); //valiity array

                        // item details
                        $that.parent().parent().siblings()
                            .children('.details-field')
                            .val(D.details.item_details);

                        // item color
                        // $that.parent().parent().siblings()
                        //     .children('.color-field')
                        //     .val(D.details.item_color);

                        // item brand
                        if (D.details.item_brand !== null) {
                            let findBrand = brandField.filter(item => {
                                return D.details.item_brand === item.value;
                            });

                            $that.parent().parent().siblings()
                                .children('.brand-field').children()
                                .each((i, option) => {
                                    if (option.value === findBrand[0].value) {
                                        $(option).attr('selected', 'selected');
                                    }
                                    else {
                                        $(option).removeAttr('selected');
                                    }
                                });
                        }

                        // item gb
                        // if (parseInt(D.details.item_gb) !== 0) {
                        //     let findGB = gbField.filter(item => {
                        //         return D.details.item_gb === item.value;
                        //     });

                        //     $that.parent().parent().siblings()
                        //         .children('.gb-field').children()
                        //         .each((i, option) => {
                        //             if (option.value === findGB[0].value) {
                        //                 $(option).attr('selected', 'selected');
                        //             }
                        //             else {
                        //                 $(option).removeAttr('selected');
                        //             }
                        //         });
                        // }

                        // print button
                        $that.parent().parent().siblings()
                            .children('.print_tag').removeAttr('disabled');
                    }
                    else {
                        // new record: TAC
                        $that.parent().removeClass('has-error').removeClass('has-warning').addClass('has-success');
                        $that.siblings('.help-block').html('New Record');
                        validImei.push(1); //valiity array

                        // print button
                        $that.parent().parent().siblings()
                            .children('.print_tag').removeAttr('disabled');


                        // Fetch same previous TAC data to fillup remaiining fields
                        let lastSameTac = [...document.querySelectorAll('.item-code-field')].filter(imei => {
                            return $that.val().slice(0, 8) === imei.value.slice(0, 8) ? $that : null;
                        });
                        lastSameTac = lastSameTac[lastSameTac.length - 2]; //Last same Tac

                        // item details
                        let lastDetails = $(lastSameTac).parent().parent().siblings().children('.details-field').val();
                        $that.parent().parent().siblings()
                            .children('.details-field')
                            .val(lastDetails);

                        // item color
                        let lastColor = $(lastSameTac).parent().parent().siblings().children('.color-field').val();
                        $that.parent().parent().siblings()
                            .children('.color-field')
                            .val(lastColor);

                        // item brand
                        let lastBrand = $(lastSameTac).parent().parent().siblings().children('.brand-field').val();
                        $that.parent().parent().siblings()
                            .children('.brand-field').children()
                            .each((i, option) => {
                                if (option.value === lastBrand) {
                                    $(option).attr('selected', 'selected');
                                }
                                else {
                                    $(option).removeAttr('selected');
                                }
                            });

                        // item gb
                        let lastGb = $(lastSameTac).parent().parent().siblings().children('.gb-field').val();
                        $that.parent().parent().siblings()
                            .children('.gb-field').children()
                            .each((i, option) => {
                                if (option.value === lastGb) {
                                    $(option).attr('selected', 'selected');
                                }
                                else {
                                    $(option).removeAttr('selected');
                                }
                            });
                    }

                    // if validImei has done all imei validation
                    if ($('.item-code-field').length === validImei.length) {
                        $('.verify-form .fa-spin').hide();
                        let isValidImei = validImei.filter(item => item === 0);
                        // if no invalid imei
                        if (isValidImei.length < 1) {
                            $('.submit-form').removeClass('disabled');
                            $('.submit-form').prop('disabled', false);
                        }
                        else {
                            // $('.submit-form').addClass('disabled');
                        }
                    }
                } //success ended
            }); // ajax ended
            return 1;

        }//unique imei added else ended

    } // show error if imei length is incorrect
    else {
        $that.parent().removeClass('has-success').removeClass('has-warning').addClass('has-error');
        $that.siblings('.help-block').html('16 or 15 digits required');
        validImei.push(0);
        x.play(); //error beep


        // print button
        $that.parent().parent().siblings()
            .children('.print_tag').attr('disabled', true);
        return 0;
    }
    console.log(validImei);
} /**validatedetails ended**/


// date picker
$('#order_date').datepicker({
    autoclose: true,
    format: 'yyyy/mm/dd'
});


$(document).on('keypress focusout', '.item-code-field', processKey);
function processKey(event) {
    if (event.keyCode === 13) {
        event.preventDefault();
        let na = validateDetails.call(this);
        if (na) {
            addNewRow();
        }
    }
}

// disable enter key
$(document).keypress(
function (event) {
    let isImeiFocused = document.activeElement.className.indexOf('item-code-field'); //find if imei field focused
    if (event.which == '13' && isImeiFocused === -1) {
        event.preventDefault();
        addNewRow();
    }
    formIsSubmitable();
});


// show/hide booking/submit button
$('.submit-form').hide();
$('.booking-completed').on('click', function (e) {
    e.preventDefault();
    $(this).hide();
    $('.submit-form').show();
});

// add new row button
$('.add_row').on('click', function (e) {
    e.preventDefault();
    addNewRow();
})

// remove row
$(document).on('click', '.del_row', function (e) {
    e.preventDefault();
    $(this).parent().parent().remove();
    formIsSubmitable();
});
function formIsSubmitable(){
    console.log($('.has-error').length);
    if ($('.has-error').length < 1) {
        console.log('if')
        $('.add_row').removeAttr('disabled');
        $('.submit-form').removeClass('disabled');
    }
    else{
        console.log('else')
        $('.add_row').attr('disabled',"");
        $('.submit-form').addClass('disabled');
    }
}


/** Print tag **/
// *****
// $('.print_tag').attr('disabled', true);
// Print single Tag
$(document).on('click', '.print_tag', function (e) {
    e.preventDefault();
    printTag(this);
});

function printTag(that) {
    console.log('clicked')

    let item_code = $(that).parent().parent().children().find('.item-code-field').val(),
        details = $(that).parent().parent().children().find('.details-field').val(),
        rowId = $(that).parent().parent().find('.row-id').html().trim();

    // create SVG
    JsBarcode(`.code${rowId}`, item_code);
    let barcode = document.querySelector(`.code${rowId}`).outerHTML;

    let brand = null;
    $(that).parent().parent().children().find('.brand-field').children().filter((i, item) => {
        if (item.selected) {
            brand = item.innerHTML;
        }
    });

    var printContent = `
        <div class="item_code_code">
          <p class="text-center show-on-print">
            ${brand} ${details} 
            ${barcode}
          </p>
        </div>
      `;
    var tagContainer = document.querySelector('.tag-container');
    tagContainer.innerHTML = printContent;
    // document.body.innerHTML = tagContainer.outerHTML;
    window.print();
    tagContainer.innerHTML = "";
}

// Barcode size for print
[...document.querySelectorAll('.code727')].map(function (item) {
    item.style.height = "60px";
});
  // *****
  /** /Print tag **/
