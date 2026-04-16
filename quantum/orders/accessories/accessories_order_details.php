<?php //error_reporting(E_ALL & ~E_NOTICE); ?>
<?php include '../../db_config.php';  ?>
<?php //include 'includes/order_email.php';  ?>
<?php include "../../authenticate.php" ?>
<?php $global_url="../../"; ?>
<?php 

  // get order details
  $order_id = $_GET['ord_id'];
  $query = mysqli_query($conn,"SELECT * FROM tbl_accessories_orders 
  WHERE order_id='".$order_id."'")
  or die('error: '.mysqli_error($conn));
  $get_order_details = mysqli_fetch_assoc($query);

  $get_customer_query = mysqli_query($conn,"Select * from tbl_customers 
  where customer_id='".$get_order_details['customer_id']."'");
  $get_customer = mysqli_fetch_assoc($get_customer_query);


/*/************/
/*Export to Excel Started*/
/*/************/
if(isset($_POST['export-to-excel']) || isset($_POST['download_report'])){

    // Store items in array
    $item_array= array();
    for($i=0;$i < count($_POST['item_code']); $i++){
      $item_array[] = array(
        'Product' => $_POST['item_code'][$i],
        'Brand'=> $_POST['item_brand'][$i],
        'Qty'=> $_POST['item_qty'][$i],
      );
    }

  function ExportFile($records) {
    $heading = false;
    if(!empty($records)){
      foreach($records as $row) {
        if(!$heading) {
          // display field/column names as a first row
          echo implode("\t", array_keys($row)) . "\n";
          $heading = true;
        }
        echo implode("\t", array_values($row)) . "\n";
      }
    }
    exit;
  }

  // $filename = $_POST["ExportType"] . ".xls";		 
    $filename = "OID#".$get_order_details['order_id']."_".$get_customer['name']."_".$get_order_details['date'].".xls";		 
    header("Content-Type: application/vnd.ms-excel");
    header("Content-Disposition: attachment; filename=\"$filename\"");
    ExportFile($item_array);
    exit();

  }//if ended
/*/************/
/*Export to Excel Ended*/
/*/************/

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
                    <?php 
                include "../../shared/invoice_header.php";
                invoiceHeader(
                  true,
                  $get_customer, 
                  $order_id, 
                  $get_order_details,
                  "Dispatch# : <span class='order_id'>AO-". $order_id."</span>"
                );               
              ?>
                    <br>

                    <!-- Table row -->
                    <div class="row">
                      <div class="col-xs-12 table-responsive">
                        <table class="table table-bordered items_table">
                          <thead>
                            <tr>
                              <th>Product</th>
                              <th>Brand</th>
                              <th>Qty</th>
                            </tr>
                          </thead>
                          <tbody>
                            <?php 
                    $query2 = mysqli_query($conn,"SELECT * FROM tbl_accessories_orders 
                    WHERE order_id='".$order_id."' order by tbl_accessories_orders.id")
                    or die('error: '.mysqli_error($conn));

                    $no = 0; 
                    while($row = mysqli_fetch_assoc($query2)): 

                    // get product details
                    $get_products_query = mysqli_query($conn,"select * from tbl_accessories_products
                    where id='".$row['product_id']."'")
                    or die('error: '.mysqli_error($conn));
                    $product = mysqli_fetch_assoc($get_products_query);
                    ?>
                            <tr>
                              <td>
                                <p class="item_code"><?php echo $product['title'];?></p>
                                <input type="text" value="<?php echo $product['title']; ?>" name="item_code[]"
                                  class="hidden">
                              </td>
                              <td>
                                <?php $get_modal_query = mysqli_query($conn,"select * from tbl_categories where 
                          category_id='".$product['item_brand']."'") ?>
                                <?php $get_modal = mysqli_fetch_assoc($get_modal_query); ?>
                                <?php echo $get_modal['title']; ?>
                                <input type="text" class="hidden" value="<?php echo $get_modal['title']; ?>"
                                  name="item_brand[]">
                              </td>
                              <td>
                                <!-- subtract returned qty from orderd qty -->
                                <?php $get_return_query = mysqli_query($conn,"select * from 
                          tbl_accessories_order_return where 
                          product_id=".$product['id']." and 
                          order_id='".$get_order_details['order_id']."'") ?>
                                <?php $get_return = mysqli_fetch_assoc($get_return_query); ?>

                                <?php 
                          echo $row['item_qty'] - $get_return['item_qty'];
                          ?>
                                <input type="text" class="hidden" value="<?php echo $row['item_qty']; ?>"
                                  name="item_qty[]">
                              </td>
                            </tr>
                            <?php $no += $row['item_qty']; ?>
                            <?php endwhile; ?>
                          </tbody>
                          <tfoot>
                            <tr>
                              <td colspan="2"></td>
                              <td><b>Total: <?php echo $no; ?></b></td>
                            </tr>
                          </tfoot>
                        </table>

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
                    </div>

                  </div>
                  <!-- /.box-body -->
                </div>
                <!-- /.box -->
              </div>


            </div>
          </section>
        </div>
        <!-- col -->
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
}, 1000);
//EMAIL WORK COMPLETED

$(window).on('load', function() {
  if (window.location.href.indexOf('email') >= 1) {
    $('#download-modal').modal('show');
  }
});


$('.download_report').on('click', function() {
  $('#download-modal').modal('hide');
})
</script>

</body>

</html>