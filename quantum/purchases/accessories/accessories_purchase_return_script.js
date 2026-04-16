// show/hide booking/submit button
$('.submit-form').hide();
$('.booking-completed').on('click', function (e) {
    e.preventDefault();
    $(this).hide();
    $('.submit-form').show();
});

$('#submit_purchase').on('click', function (e) {
    if ($('#purchase_items tbody tr').length <= 0) {
        alert("No item selected!");
        e.preventDefault();
    }
});

let formSubmittedCount = 1;
$(document).on('click','.submit-form',function(e){
  let inputsValidated = true; //default

  // check itemqtys
  let itemqty = document.querySelectorAll('.item_qty');
  // let checkitemqty = Array.prototype.filter.call(itemqty, (item)=>parseInt(item.value) <= 0 || item.value.length <= 0);
  
  // // check item qty
  // if(checkitemqty.length > 0) {
  //   inputsValidated = false;
  //   alert('Item Qty is invalid or missing!')
  // }

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
