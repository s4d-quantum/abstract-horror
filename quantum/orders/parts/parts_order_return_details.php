<?php //error_reporting(E_ALL & ~E_NOTICE); ?>
<?php include '../../db_config.php';  ?>
<?php include "../../authenticate.php" ?>
<?php $global_url="../../"; ?>
<?php 

  // get order details
  $order_id = $_GET['ret_id'];
  $fetch_return_date = mysqli_query($conn,"select 
  
  ret.date,
  ord.customer_id
  
  from 

  tbl_parts_order_return as ret 
  inner join tbl_parts_orders as ord 
  on ord.order_id = ret.order_id 
  
  where ret.return_id='".$order_id."'")
  or die('error: '.mysqli_error($conn));
  $return_date = mysqli_fetch_assoc($fetch_return_date);
 
  $get_customer_query = mysqli_query($conn,"Select * from tbl_customers 
  where customer_id='".$return_date['customer_id']."'");
  $get_customer = mysqli_fetch_assoc($get_customer_query);


  /*Export to Excel Started*/
if(isset($_POST['export-to-excel']) || isset($_POST['download_report'])){

  // Store items in array
  $item_array= array();
  for($i=0;$i < count($_POST['item_code']); $i++){
    $item_array[] = array(
      'Item' => $_POST['item_code'][$i],
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
  $filename = "ORID#".$_GET['ret_id']."_".$get_customer['name']."_".$return_date['date']."_.xls";		 
  header("Content-Type: application/vnd.ms-excel");
  header("Content-Disposition: attachment; filename=\"$filename\"");
  ExportFile($item_array);
  exit();

}//if ended

/*/************/
/*/Export to Excel Ended*/
/*/************/
?>

<?php include "../../header.php";
?>

<!-- Content Wrapper. Contains page content -->
<div class="content-wrapper">

  <!-- Main content -->
  <section class="content">
    <div class="row">
      <form method="post" action="">

        <!-- Main content -->
        <div class="col-xs-12">
          <section class="content">
            <div class="row">
              <div class="col-xs-12">
                <div class="box dispatch-note">
                  <div class="box-header no-print">
                    <h3 class="box-title">Order Return Details</h3>
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
                  $return_date,
                  "Return# : <span class='order_id'>POR-". $order_id."</span>"
                );               
              ?>
                    <br>

                    <!-- Table row -->
                    <div class="row">
                      <div class="col-xs-12 table-responsive">
                        <table class="table table-bordered">
                          <tr>
                            <th>Item / Details</th>
                            <th>Brand</th>
                            <th>Qty</th>
                          </tr>
                          </thead>
                          <tbody>
                            <?php 
                      $query = mysqli_query($conn,"select 
                      pr.item_qty,
                      pr.return_id,
                      pr.product_id,
                      po.item_brand
                      from tbl_parts_order_return as pr
                      inner join 
                      tbl_parts_products as po 
                      on po.id = pr.product_id 
                      where pr.return_id='".$order_id."'")
                      or die('error: '.mysqli_error($conn));
                  
                      while($row = mysqli_fetch_assoc($query)):                       
                    ?>
                            <tr>
                              <td>
                                <?php $get_item_query = mysqli_query($conn,"select * from 
                            tbl_parts_products where 
                            id=".$row['product_id'])
                            or die('error: '.mysqli_error($conn));
                          ?>
                                <?php $get_item = mysqli_fetch_assoc($get_item_query); ?>
                                <?php echo $get_item['title']; ?>
                                <input type="text" name="item_code[]" value="<?php echo $get_item['title']; ?>"
                                  class="hidden">
                              </td>
                              <td>
                                <?php $get_modal_query = mysqli_query($conn,"select * from tbl_categories where 
                          category_id='".$row['item_brand']."'") ?>
                                <?php $get_modal = mysqli_fetch_assoc($get_modal_query); ?>
                                <?php echo $get_modal['title']; ?>
                                <input type="text" name="item_brand[]" value="<?php echo $get_modal['title']; ?>"
                                  class="hidden">
                              </td>
                              <td>
                                <?php echo $row['item_qty'];?>
                                <input type="text" name="item_qty[]" value="<?php echo $row['item_qty'];?>"
                                  class="hidden">
                              </td>
                            </tr>
                            <?php endwhile; ?>
                          </tbody>
                        </table>

                        <br>
                        <br>
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
                          <small> ANY DISCREPANCIES MUST BE REPORTED WITHIN 48 HOURS OF DELIVERY</small>
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