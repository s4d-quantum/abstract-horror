<?php error_reporting(E_ALL & ~E_NOTICE); ?>
<?php include '../db_config.php';  ?>
<?php include "../../authenticate.php" ?>
<?php $global_url="../"; ?>
<?php 

  // get order details
  $order_id = $_GET['ord_id'];
  $query = mysqli_query($conn,"select * from tbl_non_imei_orders where 
  tbl_non_imei_orders.order_id=
  '".$order_id."'")
  or die('error: '.mysqli_error($conn));

  $get_order_details = mysqli_fetch_assoc($query);

  // // get product details
  $distinct_products_query = mysqli_query($conn,"select 
  DISTINCT item_code, item_qty from tbl_non_imei_orders where 
  order_id='".$order_id."'")
  or die('error: '.mysqli_error($conn));

  // find customer
  $get_customer_query = mysqli_query($conn,"Select * from tbl_customers 
  where customer_id='".$get_order_details['customer_id']."'");
  $get_customer = mysqli_fetch_assoc($get_customer_query);

  // fetch logo 
  $fetch_logo_query = mysqli_query($conn,"Select * from tbl_settings");
  $fetch_logo_result = mysqli_fetch_assoc($fetch_logo_query);

/*/************/
/*Export to Excel Started*/
/*/************/

if(isset($_POST['export-to-excel']) || isset($_GET['excel'])){
    // sleep(5);

  //   // Store items in array
  //   $item_array= array();
  //   for($i=0;$i < count($_POST['item_code']); $i++){
  //     $item_array[] = array(
  //       'Item Code' => "'".$_POST['item_code'][$i].".",
  //       'Details'=> $_POST['item_details'][$i],
  //       'Brand'=> $_POST['item_brand'][$i],
  //       'Qty'=> $_POST['item_qty'][$i],
  //     );
  //   }

  // function ExportFile($records) {
  //   $heading = false;
  //   if(!empty($records)){
  //     foreach($records as $row) {
  //       if(!$heading) {
  //         // display field/column names as a first row
  //         echo implode("\t", array_keys($row)) . "\n";
  //         $heading = true;
  //       }
  //       echo implode("\t", array_values($row)) . "\n";
  //     }
  //   }
  //   exit;
  // }

  // // $filename = $_POST["ExportType"] . ".xls";		 
  //   $filename = $get_customer['name']."_".$get_order_details['date'].".xls";		 
  //   header("Content-Type: application/vnd.ms-excel");
  //   header("Content-Disposition: attachment; filename=\"$filename\"");
  //   ExportFile($item_array);
  //   exit();

  }//if ended
/*/************/
/*Export to Excel Ended*/
/*/************/


include "../header.php";
?>

<!-- Content Wrapper. Contains page content -->
<div class="content-wrapper">

  <!-- Main content -->
  <section class="content">
    <div class="row">

      <form action="<?=$_SERVER['PHP_SELF'];?>" method="post" id="non_imei_form">
        <!-- Main content -->
        <div class="col-xs-12">
          <section class="content">
            <div class="row">
              <div class="col-xs-12">
                <div class="box">
                  <div class="box-header no-print">
                    <h3 class="box-title">Order Details</h3>
                    <button class="btn print_btn btn-warning pull-right">
                      <i class="fa fa-print"></i> Print Page
                    </button>
                    <button class="btn bg-purple pull-right no-print exportexcel" name="export-to-excel"
                      style="margin-right:10px;">
                      <i class="fa fa-download"></i> Export to Excel
                    </button>
                  </div>
                  <!-- /.box-header -->
                  <div class="box-body">
                    <table id="example1" class="table">
                      <thead>
                        <tr>
                          <td>
                            <b>S4D Limited</b> <br>
                            01782 330780<br>
                            sales@s4dltd.com<br>
                            VAT Registration No.: 202 7041 6
                          </td>
                          <td>
                            <img src="../assets/uploads/<?php echo $fetch_logo_result['logo_image']; ?>"
                              class="pull-right" style="width:110px;">
                          </td>
                        </tr>
                        <tr>
                          <td>
                            <b>Date :</b>
                            <span class="date"><?php echo $get_order_details['date']; ?></span>
                            <br>
                            <b>Dispatch# :</b>
                            <span class="order_id"><?php echo $order_id; ?></span>
                            <br>
                            <b>Customer :</b>
                            <span class="customer"><?php echo $get_customer['name']; ?></span>
                            <br>
                          </td>
                        </tr>
                      </thead>
                    </table>
                    <br>


                    <!-- Table row -->
                    <div class="row">
                      <div class="col-xs-12 table-responsive">
                        <table class="table table-bordered items_table">
                          <thead>
                            <tr>
                              <th>Item Code</th>
                              <th>Brand</th>
                              <th>Details</th>
                              <th>Qty</th>
                            </tr>
                          </thead>
                          <tbody>
                            <?php $no = 1?>
                            <?php 
                    while($row = mysqli_fetch_assoc($distinct_products_query)): ?>
                            <?php 
                      // get product details
                      $get_products_query = mysqli_query($conn,"select 
                      * from tbl_non_imei_products where item_code ='".$row['item_code']."'")
                      or die('error: '.mysqli_error($conn));
                      $get_product = mysqli_fetch_assoc($get_products_query);
                    ?>
                            <tr>
                              <td>
                                <p class="item_code"><?php echo $row['item_code'];?></p>
                                <input type="text" value="<?php echo $row['item_code']; ?>" name="item_code[]"
                                  class="hidden item_code_value">
                              </td>

                              <td>
                                <?php $get_modal_query = mysqli_query($conn,"select * from tbl_categories where 
                        category_id='".$get_product['item_brand']."'") ?>
                                <?php $get_modal = mysqli_fetch_assoc($get_modal_query); ?>
                                <?php echo $get_modal['title']; ?>
                                <input type="text" value="<?php echo $get_modal['title']; ?>" name="item_brand[]"
                                  class="hidden brand_value">
                              </td>

                              <td><?php
                        echo $get_product['item_details']; 
                      ?>
                                <input type="text" value="<?php echo $get_product['item_details']; ?>"
                                  name="item_details[]" class="hidden details_value">
                              </td>

                              <td><?php
                        echo $row['item_qty']; 
                      ?>
                                <input type="text" value="<?php echo $row['item_qty']; ?>" name="item_qty[]"
                                  class="hidden qty_value">
                              </td>

                            </tr>
                            <?php endwhile; ?>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div class="pull-left">
                      <b>Total # of Boxes: </b> <?php echo $get_order_details['total_boxes']; ?><br>
                      <b>Total # of Pallets: </b> <?php echo $get_order_details['total_pallets']; ?><br>

                      <b>PO Reference: </b> <?php echo $get_order_details['po_box']; ?><br>
                      <b>Delivery Company: </b> <?php echo $get_order_details['delivery_company']; ?>
                    </div>
                    <div class="pull-right">
                      <b class="pull-left">Signature:</b>
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
                      <b>ANY DISCREPANCIES MUST BE REPORTED WITHIN 48 HOURS OF DELIVERY</b>
                    </center>
                  </div>
                  <!-- /.box-body -->
                </div>
                <!-- /.box -->
              </div>


            </div>
          </section>
        </div> <!-- col -->

      </form>

    </div>
    <!-- /.row -->
  </section>
  <!-- /.content -->
</div>
<!-- /.content-wrapper -->


<!-- jQuery 2.2.3 -->
<script src="<?php echo $global_url;  ?>assets/js/jquery-ui.min.js"></script>
<script src="<?php echo $global_url;  ?>assets/js/app.js"></script>
<script src="<?php echo $global_url;  ?>assets/js/dashboard.js"></script>
<script src="<?php echo $global_url;  ?>assets/js/demo.js"></script>
<script src="<?php echo $global_url;  ?>assets/js/chart.min.js"></script>
<!-- Bootstrap 3.3.6 -->
<script src="<?php echo $global_url;  ?>assets/js/bootstrap.min.js"></script>
<script src="<?php echo $global_url;  ?>assets/js/jquery-barcode.min.js"></script>
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
  let emailData = document.querySelector('.items_table tbody'),
    customer = document.querySelector('.customer').innerHTML,
    date = document.querySelector('.date').innerHTML,
    order_id = document.querySelector('.order_id').innerHTML;

  if (window.location.search.indexOf('email') > 1) {
    $.ajax({
      'type': "POST",
      'url': "includes/non_imei_order_email.php",
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


  // // Excel export work
  // var item_code = document.getElementsByClassName('item_code_value'),
  //   qty = document.getElementsByClassName('qty_value'),
  //   details = document.getElementsByClassName('details_value'),
  //   brand = document.getElementsByClassName('brand_value');

  // if(window.location.search.indexOf('excel') > 1){
  //   $.ajax({
  //     'type': "POST",
  //     'url': "includes/export_excel.php",
  //     'data': {
  //       item_code:item_code,
  //       details:details,
  //       brand:brand,
  //       qty:qty
  //     },
  //     'success': function (data) {
  //       console.log("helloworld");
  //     },
  //     'error':function(data){
  //       console.log("error");
  //     }
  //   });
  // }

}, 1000);
//EMAIL WORK COMPLETED
</script>

</body>

</html>