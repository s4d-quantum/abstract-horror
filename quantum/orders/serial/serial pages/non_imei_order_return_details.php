<?php error_reporting(E_ALL & ~E_NOTICE); ?>
<?php include '../db_config.php';  ?>
<?php include "../../authenticate.php" ?>
<?php $global_url="../"; ?>
<?php 

  // get order details
  $order_id = $_GET['ord_id'];
  $query = mysqli_query($conn,"select * from tbl_non_imei_order_return where 
  return_id=
  '".$order_id."'")
  or die('error: '.mysqli_error($conn));

  // fetch logo 
  $fetch_logo_query = mysqli_query($conn,"Select * from tbl_settings");
  $fetch_logo_result = mysqli_fetch_assoc($fetch_logo_query);


?>

<?php include "../header.php";
?>

<!-- Content Wrapper. Contains page content -->
<div class="content-wrapper">

  <!-- Main content -->
  <section class="content">
    <div class="row">

      <!-- Main content -->
      <div class="col-xs-12">
        <section class="content">
          <div class="row">
            <div class="col-xs-12">
              <div class="box">
                <div class="box-header no-print">
                  <h3 class="box-title">Order Details</h3>
                  <button class="btn btn-warning pull-right btn-space print_all_tags"
                    onclick="javascript:jsWebClientPrint.print('useDefaultPrinter=' + $('#useDefaultPrinter').attr('checked') + '&printerName=' + $('#installedPrinterName').val());">
                    <i class="fa fa-print"></i> Print All Tags
                  </button>
                  <button class="btn print_btn btn-danger pull-right">
                    <i class="fa fa-print"></i> Print Page
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
                          <?php echo $get_order_details['date']; ?>
                          <br>
                          <b>O.ID :</b>
                          <?php echo $order_id; ?>
                          <br>
                          <b>Customer :</b>
                          <?php $get_customer_query = mysqli_query($conn,"Select * from tbl_customers 
                      where customer_id='".$get_order_details['customer_id']."'") ?>
                          <?php $get_customer = mysqli_fetch_assoc($get_customer_query); ?>
                          <?php echo $get_customer['name']; ?>
                          <br>
                        </td>
                      </tr>
                    </thead>
                  </table>
                  <br>


                  <!-- Table row -->
                  <div class="row">
                    <div class="col-xs-12 table-responsive">
                      <table class="table table-bordered">
                        <tr>
                          <th>S.No</th>
                          <th>IMEI</th>
                          <th>Brand</th>
                          <th>Qty</th>
                          <th>Details</th>
                        </tr>
                        </thead>
                        <tbody>
                          <?php $no = 1?>
                          <?php while($row = mysqli_fetch_assoc($query)): ?>
                          <?php $get_details = mysqli_query($conn,"select * from tbl_non_imei_products
                     where item_code ='".$row['item_code']."'") ?>
                          <?php $details = mysqli_fetch_assoc($get_details); ?>

                          <tr>
                            <td><?php echo $no++; ?></td>
                            <td><?php echo $details['item_code']; ?></td>

                            <td>
                              <?php $get_modal_query = mysqli_query($conn,"select * from tbl_categories where 
                          category_id='".$details['item_brand']."'") ?>
                              <?php $get_modal = mysqli_fetch_assoc($get_modal_query); ?>
                              <?php echo $get_modal['title']; ?>
                            </td>

                            <td><?php
                          echo $row['item_qty']; 
                        ?></td>

                            <td><?php
                          echo $details['item_details']; 
                        ?></td>

                          </tr>
                          <?php endwhile; ?>
                        </tbody>
                      </table>
                    </div>
                  </div>






                </div>
                <!-- /.box-body -->
              </div>
              <!-- /.box -->
            </div>


          </div>
        </section>
      </div> <!-- col -->



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

// barcode generator
[...document.querySelectorAll('.item_imei')].map((item, index) => {
  JsBarcode(`.code${index+1}`, item.innerHTML);
});

// set height of each barcode 
[...document.querySelectorAll('.code727')].map(function(item) {
  item.style.height = "90px";
})
</script>


</body>

</html>