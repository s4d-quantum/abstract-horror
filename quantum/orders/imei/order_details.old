<?php 
error_reporting(E_ALL & ~E_NOTICE); ?>
<?php include '../../db_config.php';  ?>
<?php include "../../authenticate.php" ?>
<?php include "../../shared/sendEmailWithAttachment.php" ?>
<?php $global_url="../../"; ?>
<?php 


  // get purchase details
  $order_id = $_GET['ord_id'];
  $query = mysqli_query($conn,"select * from tbl_orders where 
  tbl_orders.order_id= '".$order_id."'")
  or die('error: '.mysqli_error($conn));
  $get_purchase_details = mysqli_fetch_assoc($query);


  // get product details
  $get_products_query = mysqli_query($conn,"select 
  DISTINCT im.item_imei,
  im.item_tac,
  im.item_gb,
  im.item_color,
  im.item_grade,

  tc.item_brand,
  tc.item_details,

  ord.order_id 
  from tbl_imei as im 

  inner join 
  tbl_tac as tc on 
  tc.item_tac = im.item_tac 

  inner join 
  tbl_orders as ord on 
  ord.item_imei = im.item_imei 

  where 
  ord.order_id='".$order_id."'")
  or die('error: '.mysqli_error($conn));

  // same query for email work just below 
  // get product details
  $get_products_for_email_query = mysqli_query($conn,"select 
  DISTINCT im.item_imei,
  im.item_tac,
  im.item_gb,
  im.item_color,
  im.item_grade,

  tc.item_brand,
  tc.item_details,

  ord.order_id 
  from tbl_imei as im 

  inner join 
  tbl_tac as tc on 
  tc.item_tac = im.item_tac 

  inner join 
  tbl_orders as ord on 
  ord.item_imei = im.item_imei 

  where 
  ord.order_id='".$order_id."'")
  or die('error: '.mysqli_error($conn));

  // fetch customer
  $get_customer_query = mysqli_query($conn,"Select * from tbl_customers 
  where customer_id='".$get_purchase_details['customer_id']."'");
  $get_customer = mysqli_fetch_assoc($get_customer_query);


// ***********
// Order export excel

// get product details
$get_products_query2 = mysqli_query($conn,"select 
distinct im.item_imei,
im.item_tac,
im.item_color,
im.item_gb,
im.item_grade,

tc.item_brand,
tc.item_details,

ord.order_return,
ord.order_id 

from tbl_imei as im 

inner join tbl_tac as tc 
on tc.item_tac = im.item_tac 

inner join tbl_orders as ord 
on ord.item_imei = im.item_imei 

where ord.order_id='".$order_id."' 
order by ord.id")
or die('error: '.mysqli_error($conn));



  // Send email on page load
  $subject = "OID#" . $get_purchase_details['order_id'] . "_" . $get_customer['name'] . "_" . $get_purchase_details['date'];
  $filename = $subject . ".xls";
  
  // Content for email
  $emailContent = ''; // Define your email content here


  // generating excel content 
  $item_array = array();
  while($row1 = mysqli_fetch_assoc($get_products_for_email_query)){

    // get category title 
    $get_modal_query3 = mysqli_query($conn,"select * from tbl_categories where 
    category_id='".$row1['item_brand']."'") 
    or die('error: '.mysqli_error($conn));
    $get_modal3 = mysqli_fetch_assoc($get_modal_query3); 

    // get grade title 
    $get_grade3_query = mysqli_query($conn,"select * from tbl_grades where 
    grade_id='".$row1['item_grade']."'")
    or die('error: '.mysqli_error($conn));
    $get_grade3 = mysqli_fetch_assoc($get_grade3_query);

    $item_array[] = array(
      'IMEI' => '="' . $row1['item_imei'] . '"',
      'Details' => $row1['item_details'],
      'Grade' => $get_grade3['title'],
      'Brand' => $get_modal3['title'],
      'Color' => $row1['item_color'],
      'GB' => $row1['item_gb']
    );
  }

  // print_r($item_array);
  // die();
    
  function ExportFile() {
    global $item_array;
    $heading = false;
    if (!empty($item_array)) {
      foreach ($item_array as $row) {
        if (!$heading) {
          // Display field/column names as a first row
          echo implode("\t", array_keys($row)) . "\n";
          $heading = true;
        }
        echo implode("\t", array_values($row)) . "\n";
      }
    }
  }  

  
if (isset($_GET['email'])) {
  // Generate the Excel file content for email
  ob_start(); // Start output buffering
  ExportFile(); // Assuming $item_array contains the data
  $xlsContent = ob_get_clean(); // Get the buffered content
  // EMAIL BODY 
  $body = '<html>';
  $body .= '<head>';
  $body .= '<title>My Page</title>';
  $body .= '<style>';
  $body .= 'table {';
  $body .= 'width: 400;';
  $body .= 'border-collapse: collapse;';
  $body .= '}';
  $body .= 'th, td {';
  $body .= 'padding: 8px;';
  $body .= 'text-align: left;';
  $body .= 'border-bottom: 1px solid #ddd;';
  $body .= '}';
  $body .= 'th:nth-child(even) {';
  $body .= 'background-color: #f2f2f2;';
  $body .= '}';
  $body .= '</style>';
  $body .= '</head>';
  $body .= '<body>';
  $body .= '<p>Dear Customer,</p>';
  $body .= "<p>Thank you for your order, which is on it's way to you, Please find attached your Delivery Note as a confirmation of dispatch. along with your tracking number</p>";
  // Adding the table
  $body .= '<table border="1" cellpadding="5">';
  $body .= '<tr>';

  $body .= '<td>Total # of Boxes:</td>';
  $body .= '<td>'.$get_purchase_details['total_boxes'].'</td>';
  $body .= '</tr>';
  $body .= '<tr>';
  $body .= '<td>PO Reference:</td>';
  $body .= '<td>'.$get_purchase_details['po_box'].'</td>';
  $body .= '</tr>';
  $body .= '<tr>';
  $body .= '<td>Courier:</td>';
  $body .= '<td>'.$get_purchase_details['delivery_company'].'</td>';
  $body .= '</tr>';
  $body .= '<tr>';
  $body .= '<td>Customer Ref:</td>';
  $body .= '<td>'.$get_purchase_details['customer_ref'].'</td>';
  $body .= '</tr>';
  $body .= '<tr>';
  $body .= '<td>Tracking No:</td>';
  $body .= '<td>'.$get_purchase_details['tracking_no'].'</td>';
  $body .= '</tr>';
  $body .= '</table>';

  $body .= '<p>If you have any delivery enquiries about your shipment, please contact: warehouse@s4dltd.com</p>';
  $body .= '<br><p>Yours Sincerely,</p>';
  $body .= '<p style="transform: translateX(-11px);"><img border="0" width="110" height="100" style="margin-left:-10px;" src="data:image/jpeg;base64,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" ></p>';
  $body .= '<p><span style="font-size:9px; color:gray">Office +44 1782 330780</span></p>';
  $body .= '<p><a href="http://www.s4dltd.com" target="_blank">www.s4dltd.com</a></p>';
  $body .= '<p style="font-size:9px;">Confidentiality Notice: This e-mail (and any attachment) has been sent by S4D Limited (registered in England and Wales with number 9342012). Registered office: Ebenezer House, Ryecroft, Newcastle Under Lyme, Staffordshire, ST5 2BE. This e-mail is confidential and intended for the use of the named recipient only. If you are not the intended recipient, please notify us by telephone immediately on +44(0)1782 330780 or return it to us by e-mail. Please then delete it from your system and note that any use, dissemination, forwarding, printing or copying is strictly prohibited. Any views or opinions are solely those of the author and do not necessarily represent those of S4D Limited.</p>';
  $body .= '<p style="font-size:9px;">Please note that this e-mail and any attachments have not been encrypted. They may, therefore, be liable to be compromised.</p>';
  $body .= '<p style="font-size:9px;">Please also note that it is your responsibility to scan this e-mail and any attachments for viruses. We do not, to the extent permitted by law, accept any liability (whether in contract, negligence, or otherwise) for any virus infection and/or external compromise of security and/or confidentiality in relation to transmissions sent by e-mail.</p>';
  $body .= '</body>';
  $body .= '</html>';

sendEmailWithAttachment($subject, $body, $xlsContent, $filename, 'text/html'); // Change content type as needed
exit(); // Terminate the script after generating the Excel file.
}

if (isset($_POST['export-to-excel']) || isset($_POST['download_report'])) {
// Generate the Excel file content
header("Content-Type: application/vnd.ms-excel");
header("Content-Disposition: attachment; filename=\"$filename\"");
ExportFile($item_array);
exit(); // Terminate the script after generating the Excel file.
}



// Order export excel ended
// ***********

?>

<?php include "../../header.php";
?>

<!-- Content Wrapper. Contains page content -->
<div class="content-wrapper">

  <!-- Main content -->
  <section class="content">
    <div class="row">

      <form action="" method="POST">
        <!-- Main content -->
        <div class="col-xs-12">
          <section class="content">
            <div class="row">
              <div class="col-xs-12">
                <div class="box dispatch-note">
                  <div class="box-header">
                    <h3 class="box-title">Dispatch Note</h3>
                    <button class="btn print_btn btn-warning pull-right no-print">
                      <i class="fa fa-print"></i> Print Page
                    </button>
                    <button class="btn bg-purple pull-right no-print exportexcel" name="export-to-excel"
                      style="margin-right:10px;">
                      <i class="fa fa-download"></i> Export to Excel
                    </button>
                  </div>
                  <!-- /.box-header -->
                  <div class="box-body">
                    <?php 
                include "../../shared/invoice_header.php";
                invoiceHeader(
                  true,
                  $get_customer, 
                  $order_id, 
                  $get_purchase_details,
                  "Dispatch# : <span class='order_id'>IO-". $order_id."</span>"
                );               
              ?>

                    <br>

                    <!-- Table row -->
                    <div class="row">
                      <div class="col-xs-12 table-responsive">
                        <table class="table table-bordered datatable">
                          <thead>
                            <tr>
                              <th>Description</th>
                              <th>Qty</th>
                            </tr>
                          </thead>
                          <tbody class="booking-table">
                            <?php $no = 0; ?>
                            <?php while($row = mysqli_fetch_assoc($get_products_query)): ?>
                            <div class="items">
                              <p class="item_tac hide"><?php echo $row['item_tac'];?></p>
                              <p class="hide">
                                <?php $get_modal_query = mysqli_query($conn,"select * from tbl_categories where 
                          category_id='".$row['item_brand']."'");
                          $get_modal = mysqli_fetch_assoc($get_modal_query);
                          ?>
                                <?php $get_grade_query = mysqli_query($conn,"select * from tbl_grades where 
                          grade_id='".$row['item_grade']."'");
                          $get_grade = mysqli_fetch_assoc($get_grade_query);
                          ?>
                                <span class="item_brand"><?php echo $get_modal['title']; ?></span>
                                <span class="item_details"><?php echo $row['item_details']; ?></span>
                                <span class="item_color"><?php echo $row['item_color']; ?></span>
                                <span class="item_gb"><?php echo $row['item_gb']; ?></span>
                                <span class="item_grade"><?php echo $get_grade['title']; ?></span>
                              </p>
                            </div>
                            <?php ++$no; ?>
                            <?php endwhile; ?>
                          </tbody>
                          <tfoot>
                            <tr>
                              <td></td>
                              <td><b>Total: <?php echo $no; ?></b></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                    <br>
                    <br>
                    <div class="pull-left">
                      <b>Total # of Boxes: </b> <?php echo $get_purchase_details['total_boxes']; ?><br>
                      <b>Total # of Pallets: </b> <?php echo $get_purchase_details['total_pallets']; ?><br>

                      <b>PO Reference: </b> <?php echo $get_purchase_details['po_box']; ?><br>
                      <b>Courier: </b> <?php echo $get_purchase_details['delivery_company']; ?> <br>
                      <b>Customer Ref: </b> <?php echo $get_purchase_details['customer_ref']; ?> <br>
                      <b>Tracking No: </b>
                      <span id="dpd-status">
                        <?php
                            if(strlen($get_purchase_details['tracking_no']) > 1):
                              echo $get_purchase_details['tracking_no'];
                          ?>
                        <span id="dpd-result">
                          <i style="margin-top:15px" class="fa fa-spinner fa-spin"></i>
                        </span>
                        <?php 
                          else:
                          // Display "N.A." if there are zero or one tracking numbers.
                          echo 'N.A.';
                        endif;
                        ?>
                      </span>
                    </div>

                    <div class="pull-right">
                      <b class="pull-left">Dispatched by:</b>
                      <span class="pull-right"
                        style="width:180px; height:18px; display:inline-block; border-bottom:1px solid black;"></span>
                      <br>
                      <br>
                      <b class="pull-left">Recieved by Signature:</b>
                      <span class="pull-right"
                        style="width:180px; height:18px; display:inline-block; border-bottom:1px solid black;"></span>
                      <br>
                      <br>
                      <b class="pull-left">Recieved by Print:</b>
                      <span class="pull-right"
                        style="width:180px; height:18px; display:inline-block; border-bottom:1px solid black;"></span>
                      <br>
                      <br>
                    </div>

                    <div class="clearfix"></div>
                    <center style="display:block;margin-top:27px;">
                      <small> ANY DISCREPANCIES MUST BE REPORTED WITHIN 48 HOURS OF DELIVERY</small>
                    </center>
                  </div>
                  <!-- /.box-body -->
                </div>
                <!-- /.box -->
              </div>

            </div>
          </section>
        </div> <!-- col -->


        <!-- Excel export ended -->
        <table class="table table-bordered no-print" style="visibility:hidden;">
          <thead>
            <tr>
              <th>IMEI</th>
              <th>Brand</th>
              <th>Details</th>
              <th>grade</th>
              <th>Color</th>
              <th>GB</th>
            </tr>
          </thead>
          <tbody>
            <?php while($row2 = mysqli_fetch_assoc($get_products_query2)): ?>
            <tr>
              <td>
                <?php echo $row2['item_imei'];?>
                <input type="text" value="<?php echo $row2['item_imei']; ?>" name="item_imei[]">
              </td>

              <td>
                <?php $get_modal_query2 = mysqli_query($conn,"select * from tbl_categories where 
                category_id='".$row2['item_brand']."'") ?>
                <?php $get_modal2 = mysqli_fetch_assoc($get_modal_query2); ?>
                <?php echo $get_modal2['title']; ?>
                <input type="text" value="<?php echo $get_modal2['title']; ?>" name="item_brand[]">
              </td>

              <td><?php
                echo $row2['item_details']; 
                ?>
                <input type="text" value="<?php echo $row2['item_details']; ?>" name="item_details[]">
              </td>

              <td>
                <?php 
                  $get_grade2_query = mysqli_query($conn,"select * from tbl_grades where 
                  grade_id='".$row2['item_grade']."'");
                  $get_grade2 = mysqli_fetch_assoc($get_grade2_query);
                  ?>
                <?php echo $get_grade2['title']; ?>
                <input type="text" value="<?php echo $get_grade2['title']; ?>" name="item_grade[]">
              </td>

              <td><?php
                echo $row2['item_color']; 
                ?>
                <input type="text" value="<?php echo $row2['item_color']; ?>" name="item_color[]">
              </td>

              <td><?php
                echo $row2['item_gb']; 
                ?>
                <input type="text" value="<?php echo $row2['item_gb']; ?>" name="item_gb[]">
              </td>
            </tr>
            <?php endwhile; ?>
          </tbody>
          <!-- Excel export ended -->
        </table>
    </div>
    <!-- /.row -->
  </section>
  <!-- /.content -->
</div>
<!-- /.content-wrapper -->
</div>


<!-- download modal -->
<div class="modal fade" id="download-modal">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
          <span aria-hidden="true">&times;</span></button>
        <h4 class="modal-title">Do you want to download the Report?</h4>
      </div>
      <div class="modal-footer">
        <button type="submit" name="download_report" class="download_report btn btn-success"
          style="width:80px;">Yes</button>
        <button type="button" class="btn btn-warning" style="width:80px;" data-dismiss="modal">No</button>
      </div>
    </div>
    <!-- /.modal-content -->
  </div>
  <!-- /.modal-dialog -->
</div>
<!-- /download modal -->


</form>


<?php $global_url="../../"; ?>
<?php include $global_url."footer.php";?>
<script>
// print all
$('.print_btn').on('click', function() {
  window.print();
});


// ========
// Email sending 
// ========
// send email after 1 second until all data loaded
setTimeout(function() {
  let emailData = document.querySelector('.datatable > tbody'),
    customer = document.querySelector('.customer').innerHTML,
    date = document.querySelector('.date').innerHTML,
    order_id = document.querySelector('.order_id').innerHTML;

  if (window.location.search.indexOf('email') > 1) {
    $.ajax({
      'type': "POST",
      'url': "includes/order_email.php",
      'data': {
        order_id,
        date,
        customer,
        message: emailData.innerHTML
      },
      'success': function(data) {
        console.log("success");
        console.log(data);
      },
      'error': function(data) {
        console.log('error')
        console.log(data);
      }
    });
  }
}, 1000);
//EMAIL WORK COMPLETED

// DISPATCH NOTE VIEW GENERATION
let itemTacs = [...document.querySelectorAll('.items')];
let items = [],
  finalItems = [],
  count = 0,
  temp = '';

itemTacs.forEach(tac => {
  items.push({
    tac: tac.querySelector('.item_tac').textContent.trim(),
    brand: tac.querySelector('.item_brand').textContent.trim(),
    details: tac.querySelector('.item_details').textContent.trim(),
    color: tac.querySelector('.item_color').textContent.trim(),
    gb: tac.querySelector('.item_gb').textContent.trim(),
    grade: tac.querySelector('.item_grade').textContent.trim()
  });
});

// match each item with one anothe, count the matched ones and replace with null if matched
for (let i = 0; i < items.length; i++) {

  // find if item already selected
  let na = finalItems.filter(item =>
    item.details.toLowerCase() === items[i].details.toLowerCase() &&
    item.color.toLowerCase() === items[i].color.toLowerCase() &&
    item.brand.toLowerCase() === items[i].brand.toLowerCase() &&
    item.grade.toLowerCase() === items[i].grade.toLowerCase() &&
    item.gb.toLowerCase() === items[i].gb.toLowerCase()
  ).length;
  // if item not traversed before
  if (na < 1) {
    for (let j = 0; j < items.length; j++) {
      if (
        items[i].details.toLowerCase() === items[j].details.toLowerCase() &&
        items[i].color.toLowerCase() === items[j].color.toLowerCase() &&
        items[i].brand.toLowerCase() === items[j].brand.toLowerCase() &&
        items[i].grade.toLowerCase() === items[j].grade.toLowerCase() &&
        items[i].gb.toLowerCase() === items[j].gb.toLowerCase()) {
        count++;
      }
    }
    finalItems.push({
      tac: items[i].tac,
      brand: items[i].brand,
      details: items[i].details,
      color: items[i].color,
      gb: items[i].gb,
      grade: items[i].grade,
      qty: count
    });
    count = 0;
  }
}

let calculatedDetails = document.querySelectorAll('.calculated_details'),
  calculatedQty = document.querySelectorAll('.calculated_qty');

finalItems.forEach((item, i) => {
  $('tbody.booking-table').append(
    `<tr>	
        <td>
          <p class="calculated_details">
            ${item.brand} 
            ${item.details} 
            ${item.color} 
            ${item.gb.length > 0?item.gb+'GB' : ''} 
            ${item.grade.length > 0?'Grade '+item.grade:''}</p>
        </td>
        <td class="calculated_qty">${item.qty}</td>
      </tr>`);
});

// $(window).on('load', function() {
//   if (window.location.href.indexOf('email') >= 1) {
//     $('#download-modal').modal('show');
//   }
// });


// $('.download_report').on('click', function() {
//   $('#download-modal').modal('hide');
// })


// fetch dpd tracking status
let dpdStatus = document.getElementById('dpd-status').innerText.trim();
if (!!dpdStatus && dpdStatus.length > 5) {

  $.ajax({
    type: "POST",
    url: "includes/fetch_delivery_status.php",
    data: {
      dpd_status: dpdStatus
    },
    success: function(response) {
      parser = new DOMParser();
      xmlDoc = parser.parseFromString(response, "text/xml");
      let result = xmlDoc.getElementsByTagName("trackingresponse")[0]
        .childNodes[0]
        .childNodes[0]
        .getElementsByTagName('trackingevents')[0]
        .childNodes[0]
        .getElementsByTagName('description')[0]
        .innerHTML;


      $('#dpd-result').text(` - ${result}`);
    },
    error: function(err) {
      $('#dpd-result').text("");
    }
  });
}
</script>


</body>

</html>