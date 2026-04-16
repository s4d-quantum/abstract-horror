<?php error_reporting(E_ALL & ~E_NOTICE); ?>
<?php include '../../db_config.php';  ?>
<?php include "../../authenticate.php" ?>
<?php $global_url="../../"; ?>
<?php 

  // get order details
  $order_id = $_GET['ord_id'];
  $order_query = mysqli_query($conn,"select 
    distinct od.item_imei,
    od.return_id,
    od.date,
    ord.customer_id
    
    from tbl_order_return as od

    inner join tbl_orders as ord 
    on ord.order_id = od.order_id
    
    where 
    od.return_id = '".$order_id."'")
    or die('error: '.mysqli_error($conn));
  $get_order_details = mysqli_fetch_assoc($order_query);

  // fetch customer
  $get_customer_query = mysqli_query($conn,"Select * from tbl_customers 
  where customer_id='".$get_order_details['customer_id']."'");
  $get_customer = mysqli_fetch_assoc($get_customer_query);

  /*/************/
/*Export to Excel Started*/
/*/************/
  if(isset($_POST['export-to-excel']) || isset($_POST['download_report'])){

    // Store items in array
    $item_array= array();
    for($i=0;$i < count($_POST['item_imei']); $i++){

      $item_array[] = array(
        'IMEI' => '="'.$_POST['item_imei'][$i].'"',
        'Details'=> $_POST['item_details'][$i],
        'Brand'=> $_POST['item_brand'][$i],
        'Color'=> $_POST['item_color'][$i],
        'GB'=> $_POST['item_gb'][$i],
        'Supplier'=> $_POST['supplier'][$i]
      );
    }

    // print_r($item_array);
    // die();

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
    $filename = "ORID#".$get_order_details['return_id']."_".$get_customer['name'].'_'.$get_order_details['date']."_.xls";		 
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

      <form action="" method="post">

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
                  $get_order_details,
                  "Return ID# : <span class='order_id'>IOR-". $order_id."</span>"
                );               
              ?>
                    <br>

                    <div id="<?php echo $get_order_details['customer_id']; ?>">

                      <!-- Table row -->
                      <div class="row">
                        <div class="col-xs-12 table-responsive">
                          <table class="table table-bordered">
                            <tr>
                              <th>Description</th>
                              <th>Qty</th>
                            </tr>
                            </thead>
                            <tbody class="booking-table">
                              <?php 
                    $order_query2 = mysqli_query($conn,"select 
                      distinct od.item_imei,
                      (select pr.supplier_id from tbl_purchases as pr
      where  pr.item_imei = od.item_imei ORDER BY pr.id DESC LIMIT 1) as supplier_id

                      from tbl_order_return as od

                      where 
                      od.return_id = ".$order_id)
                      or die('error: '.mysqli_error($conn));

                    while($row = mysqli_fetch_assoc($order_query2)): 

                      // get product details
                      $get_products_query = mysqli_query($conn,"select 
                        im.item_imei,
                        im.item_color,
                        im.item_gb,
                        im.item_grade,
                        tc.item_details,
                        tc.item_brand,
                        tc.item_tac
                        from tbl_imei as im 
                        
                        inner join tbl_tac as tc 
                        on im.item_tac = tc.item_tac 
                        
                        where 
                        im.item_imei= '".$row['item_imei']."'")
                        or die('error: '.mysqli_error($conn));
                      $product_details = mysqli_fetch_assoc($get_products_query);
                    ?>

                              <tr class="items hidden">
                                <td>
                                  <p class="item_tac"><?php echo $product_details['item_tac'];?></p>
                                  <p class="item_imei"><?php echo $product_details['item_imei'];?></p>
                                  <input type="text" name="item_imei[]"
                                    value="<?php echo $product_details['item_imei'];?>">
                                </td>
                                <td>
                                  <!-- Fetch Category Title -->
                                  <?php 
                          $get_modal_query = mysqli_query($conn,"select * from tbl_categories where 
                          category_id='".$product_details['item_brand']."'");
                          $get_modal = mysqli_fetch_assoc($get_modal_query); 
                        ?>
                                  <p class="item_brand"><?php echo $get_modal['title']; ?></p>
                                  <input type="text" name="item_brand[]" value="<?php echo $get_modal['title']; ?>">
                                </td>
                                <td class="item_details"><?php echo $product_details['item_details'];?>
                                  <input type="text" name="item_details[]"
                                    value="<?php echo $product_details['item_details'];?>">
                                </td>
                                <td class="item_color"><?php echo $product_details['item_color'];?>
                                  <input type="text" name="item_color[]"
                                    value="<?php echo $product_details['item_color'];?>">
                                </td>
                                <td class="item_gb"><?php
                        echo $product_details['item_gb']; ?>
                                  <input type="text" name="item_gb[]" value="<?php echo $product_details['item_gb'];?>">
                                </td>
                                <td>
                                  <?php 
                        // fetch supplier
                        $get_supplier_query = mysqli_query($conn,"Select name from tbl_suppliers 
                        where supplier_id='".$row['supplier_id']."'");
                        $get_supplier = mysqli_fetch_assoc($get_supplier_query);
                      ?>
                                  <input type="text" name="supplier[]" value="<?php echo $get_supplier['name'];?>">
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

// DISPATCH NOTE VIEW GENERATION
let itemTacs = [...document.querySelectorAll('.items')];
let items = [],
  finalItems = [],
  count = 0,
  temp = '';

itemTacs.forEach(tac => {
  items.push({
    tac: tac.querySelector('.item_imei').textContent.trim(),
    brand: tac.querySelector('.item_brand').textContent.trim(),
    details: tac.querySelector('.item_details').textContent.trim(),
    color: tac.querySelector('.item_color').textContent.trim(),
    gb: tac.querySelector('.item_gb').textContent.trim()
  });
});


function formatStorage(gbVal) {
  var n = parseInt(gbVal, 10);
  if (!isFinite(n) || isNaN(n)) return '';
  return n >= 1024 ? (n / 1024) + ' TB' : n + ' GB';
}

// match each item with one anothe, count the matched ones and replace with null if matched
for (let i = 0; i < items.length; i++) {

  // find if item already selected
  let na = finalItems.filter(item =>
    item.details.toLowerCase() === items[i].details.toLowerCase() &&
    item.color.toLowerCase() === items[i].color.toLowerCase() &&
    item.gb.toLowerCase() === items[i].gb.toLowerCase() &&
    item.brand.toLowerCase() === items[i].brand.toLowerCase()
  ).length;
  // if item not traversed before
  if (na < 1) {
    for (let j = 0; j < items.length; j++) {
      if (
        items[i].details.toLowerCase() === items[j].details.toLowerCase() &&
        items[i].color.toLowerCase() === items[j].color.toLowerCase() &&
        items[i].gb.toLowerCase() === items[j].gb.toLowerCase() &&
        items[i].brand.toLowerCase() === items[j].brand.toLowerCase()) {
        count++;
      }
    }
    finalItems.push({
      tac: items[i].tac,
      brand: items[i].brand,
      details: items[i].details,
      color: items[i].color,
      gb: items[i].gb,
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
          ${item.gb.length > 0 ? formatStorage(item.gb) : ''}
          </p>
        </td>
        <td class="calculated_qty">${item.qty}</td>
      </tr>`);
});

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
