// show/hide booking/submit button
$('.submit-form').hide();
$('.booking-completed').on('click', function (e) {
    e.preventDefault();
    $(this).hide();
    $('.submit-form').show();
});



// disable enter key
$(document).keypress(
    function (event) {
        if (event.which == '13' && isitemFocused === -1) {
            event.preventDefault();
        }
    });


$(document).ready(function () {
    $(".select2").select2();
});

///////////////
// SUBMIT FORM
//////////////
$('#submit_purchase').on('click', function (e) {
    if ($('#purchase_items tbody tr').length <= 0) {
        alert("No item selected!");
        e.preventDefault();
    }
});

