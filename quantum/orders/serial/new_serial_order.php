<?php //error_reporting(E_ALL & ~E_NOTICE); ?>
<?php include '../../db_config.php';  ?>
<?php $global_url="../../"; ?>
<?php include "../../authenticate.php" ?>
<?php 

  // DISPLAYING customerS
  $display_customers_query = mysqli_query($conn,"select * from tbl_customers order by name");

  // fetch po ref
  $fetch_po_ref = mysqli_query($conn,"select po_ref from tbl_serial_sales_orders 
  where order_id=".$_GET['sales_order']);
  $po_ref = mysqli_fetch_assoc($fetch_po_ref)['po_ref'];

  // NEW order ID
  $new_ord_id_query = mysqli_query($conn,"Select max(order_id) from tbl_serial_orders")
  or die('Error:: ' . mysqli_error($conn));
  $order_id_result = mysqli_fetch_assoc($new_ord_id_query);

  if($order_id_result['max(order_id)'] == 0) {
    $new_id = 2884;
  }
  else{
    $new_id = ($order_id_result['max(order_id)'] + 1);
  }

  $new_ord_id = $new_id;

  $curr_date = date("Y-m-d");
  
  // *********
  // SUBMIT order
  // *********
  if(isset($_POST['submit_order'])){

    $date = str_replace("/", "-", $_POST['order_date']);
    $customer_id = $_POST['order_customer'];
    $user_id = $_SESSION['user_id'];
   

  // INSERT TO order INVENTORY TBL
  for($i = 0;$i<count($_POST['item_code']);$i++){

    // INSERT TO order TBL
    $new_order_query = mysqli_query($conn,"insert into tbl_serial_orders (
      order_id,
      customer_id,
      item_code,
      date,
      total_boxes,
      total_pallets,
      po_box,
      delivery_company,
      user_id,
      order_return,
      unit_confirmed
      ) values(
        '".$new_ord_id."',
        '".$customer_id."',
        '".$_POST['item_code'][$i]."',
        '".$date."',".
        $_POST['total_boxes'].",".
        $_POST['total_pallets'].",'".
        $_POST['po_box']."','".            
        $_POST['delivery_company']."',
        ".$user_id.",
        0,
        0)")
      or die('Error:: ' . mysqli_error($conn));

    // UPDATE PRODUCT 
    $new_product_query = mysqli_query($conn,"update tbl_serial_products 
    set status = 0 where item_code = '".$_POST['item_code'][$i]."'")
      or die('Error:: ' . mysqli_error($conn));

      
    $new_imei = mysqli_query($conn,"update tbl_serial_products set status=0 
    where item_code ='".$_POST['item_code'][$i]."'") 
    or die('Error:: ' . mysqli_error($conn));
      
    // INPUT LOG EACH ITEM
    $new_log = mysqli_query($conn,"insert into tbl_log (
      ref,
      subject,
      details,
      date, 
      user_id,
      item_code
      )
      values
      (
      'SO-".$new_ord_id."',
      'NEW SERIAL ORDER',
      'QTY:1',
      '".$date."',
      ".$user_id.",
      '".$_POST['item_code'][$i]."'
      )")
      or die('Error:: ' . mysqli_error($conn));
      
  }//LOOP ENDED

    // Set item status to completed in tbl_serial_sales_orders
    $update_sales_order = mysqli_query($conn,"update tbl_serial_sales_orders 
    set 
    is_completed = 1, 
    goodsout_order_id =".$new_ord_id." 
    where order_id = ".$_GET['sales_order'])
    or die('Error:: '.mysqli_error($conn));
  
    header("location:serial_order_details.php?ord_id=".$new_ord_id."&email=1");

  }

?>
<?php include "../../header.php" ?>

<!-- Content Wrapper. Contains page content -->
<div class="content-wrapper no-print">
  <!-- Content Header (Page header) -->
  <section class="content-header">
    <h1 class="pull-left">
      New Order
    </h1>
    <button class="btn btn-success pull-right add_accessories_btn" data-toggle="modal" data-target="#download-modal"><i
        class="fa fa-search"></i>
      View Sales Items</button>

    <!-- Save and retrieve scanned items  -->
    <div class="btn-group pull-right" style="margin-right:5px">
      <button class="btn btn-info save_btn"><i class="fa fa-download"></i>
        Save Items</button>
      <!-- /fetch scanned items  -->
      <button class="btn auto_scan btn-primary"><i class="fa fa-upload"></i>
        Reload Items</button>
    </div>

  </section>
  <br>
  <br>

  <!-- Main content -->
  <section class="content">
    <div class="row">

      <!-- col -->
      <form enctype="multipart/form-data" method="post" id="confirm_order" action="">
        <div class="col-md-12">
          <!-- box started-->
          <div class="box box-warning">
            <div class="box-body">

              <div class="row">
                <label for="" class="col col-md-4 col-sm-6">
                  Date
                  <input type="text" name="order_date" class="form-control order_date" id="order_date"
                    value="<?php echo $curr_date; ?>">
                </label>

                <div class="form-group col col-md-5 col-sm-6">
                  <label>Select Customer</label>
                  <select required class="form-control order_customer" name="order_customer" readonly>
                    <option value="">Select Customer</option>
                    <?php while($row = mysqli_fetch_assoc($display_customers_query)):?>
                    <option value="<?php echo $row['customer_id']; ?>"
                      <?php echo $_GET['cust'] === $row['customer_id'] ? 'selected' : ''?>>
                      <?php echo $row['name']; ?> </option>
                    <?php endwhile; ?>
                  </select>
                </div>

              </div>

              <div class="row">

                <div class="po-box col-md-3 col-sm-4">
                  <label for="">Total # of Boxes</label>
                  <input type="number" name="total_boxes" class="total_boxes form-control">
                </div>

                <div class="po-box col-md-3 col-sm-4">
                  <label for="">Total # of Pallets</label>
                  <input type="number" name="total_pallets" class="total_pallets form-control">
                </div>

                <!-- PO Box -->
                <div class="po-box col-md-3 col-sm-4">
                  <label for="">PO Reference</label>
                  <input type="text" name="po_box" value="<?php echo $po_ref; ?>" class="form-control">
                </div>

                <!-- Delivery Company -->
                <div class="deliver-company col-md-3 col-sm-4">
                  <label for="">Delivery Company</label>
                  <input type="text" name="delivery_company" class="form-control">
                </div>
              </div>


            </div>
            <!-- /.box-body -->
          </div>
          <!-- /.box -->
        </div>
        <!-- col -->

        <!-- col -->
        <div class="col-md-12">
          <div class="box box-success">
            <div class="box-header">
              <h3 class="box-title">Select Items</h3>
            </div>
            <div class="box-body">
              <table class="table" id="order_items">
                <thead>
                  <tr>
                    <th>Item Code</th>
                    <th>Brand</th>
                    <th>Details</th>
                    <th>Grade</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <div class='form-group'>
                        <input type='text' class='item_code form-control' required placeholder="Item code"
                          name='item_code[]' tabindex="">
                        <span class='help-block'></span>
                      </div>
                    </td>
                    <td>
                      <input type="text" name="item_brand[]" placeholder="Item brand" class="form-control item_brand">
                    </td>
                    <td>
                      <input type="text" name="item_details[]" placeholder="Item details"
                        class="item_details form-control">
                    </td>
                    <td>
                      <input type="text" name="item_grade[]" placeholder="Item grade" class="item_grade form-control">

                    </td>
                    <td>
                      <!-- <button class="del_row btn btn-danger"><i class="fa fa-close"></i></button>   -->
                    </td>
                  </tr>
                  <!-- <tr class="add_new_row">
                      <td colspan="5"> -->
                  <!-- <button type="button" class="btn btn-primary btn-block add_row">
                          <i class="fa fa-plus"></i> &nbsp;Add Item
                        </button> -->
                  <!-- </td>
                    </tr> -->
                </tbody>
              </table>
              <hr>
              <p class="pull-left">
                <b>Total items: </b> <span class="total_items">1</span>
              </p>
            </div>
          </div>
        </div>
        <!-- /.col -->

        <div class="col-md-12">
          <button class="btn btn-primary btn-lg booking-completed pull-right">Booking Completed</button>
          <input type="submit" name="submit_order" class="submit-form btn btn-success btn-lg pull-right"
            value="Confirm order" id="submit_order">
        </div>

      </form>
    </div>
    <!-- /.row -->
  </section>
  <!-- /.content -->

</div>
<!-- /.content-wrapper -->

</div>

<!-- sales items modal -->
<input type="text" class="hide form-control sales_order_id" value="<?php echo $_GET['sales_order']; ?>">
<div class="modal fade" id="download-modal">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h4 class="pull-left">Sales Items</h4>
        <button class="no-print btn btn-success pull-right print_sales_items">Print</button>
        <h4 class="modal-title">
        </h4>
      </div>
      <div class="modal-body">
        <!-- For calculation purpose  -->
        <ol class="sales-order-items hidden" style="max-height:500px; overflow-y:scroll;">
          <?php 
              $fetch_sales_orders = mysqli_query($conn,"select * from tbl_serial_sales_orders where 
              order_id=".$_GET['sales_order']);
              while($sales = mysqli_fetch_assoc($fetch_sales_orders)): 

              ?>
          <li style="padding:4px;">
            <?php echo " <span class='sales_brand'>".$sales['item_brand']."</span> "
                    ." <span class='sales_details'>".$sales['item_details']."</span> "
                    ." <span class='sales_grade'>".$sales['item_grade']."</span> "
                    ." [<span class='sales_tray'>".$sales['tray_id']."</span>] "
                    ." [<span class='sales_supplier'>".$sales['supplier_id']."</span>] ";
                  ?>
          </li>
          <?php endwhile;?>
        </ol>
        <!-- For calculation purpose  -->


        <!-- sales order items -->
        <div class="divTable sales-order-visible-items" style="max-height:500px;overflow-y:scroll;">
          <div class="divTableHeading">
            <div class="divTableHead flex4">Details</div>
            <div class="divTableHead flex1">Qty</div>
            <div class="divTableHead flex1">Remaining</div>
          </div>
          <div class="divTableBody">
          </div>
        </div>
        <!-- /sales order items -->


      </div>
    </div>
    <!-- /.modal-content -->
  </div>
  <!-- /.modal-dialog -->
</div>
<!-- /sales items modal -->


<!-- duplicate beep -->
<audio id="duplicate-beep">
  <source src="../../duplicate-beep.mp3" type="audio/mp3">
  Your browser does not support the audio element.
</audio>
<!-- /duplicate beep -->

<!-- outofstock beep -->
<audio id="outofstock-beep">
  <source src="../../outofstock-beep.mp3" type="audio/mp3">
  Your browser does not support the audio element.
</audio>
<!-- /outofstock beep -->

<!-- grades -->
<select class="form-control grade-field hide">
  <?php 
      $fetch_grades = mysqli_query($conn,"select * from tbl_grades");
      while($item = mysqli_fetch_assoc($fetch_grades)):?>
  <option value="<?php echo $item['grade_id'];?>"><?php echo $item['title']; ?></option>
  <?php endwhile;?>
</select>

<!-- Suppliers -->
<select class="hide form-control supplier-field hidden">
  <?php 	
    // fetch suppliers	
    $fetch_suppliers_query2= mysqli_query($conn,"select supplier_id, name from tbl_suppliers");	
    while($get_supplier2 = mysqli_fetch_assoc($fetch_suppliers_query2)): 	
    	
    ?>
  <option value="<?php echo $get_supplier2['supplier_id'];?>"><?php echo $get_supplier2['name']; ?></option>
  <?php endwhile;?>
</select>
<!-- Categoies-->


<!-- Categoies-->
<select class=" form-control brand-field hidden">
  <?php 	
    // fetch brands	
    $fetch_brands_query2= mysqli_query($conn,"select category_id, title from tbl_categories");	
    while($get_brand2 = mysqli_fetch_assoc($fetch_brands_query2)): 	
    	
    ?>
  <option value="<?php echo $get_brand2['category_id'];?>"><?php echo $get_brand2['title']; ?></option>
  <?php endwhile;?>
</select>
<!-- Categoies-->

<div class="page-loader no-print">
  <i class="fa fa-spinner fa-spin"></i>
</div>

<?php include $global_url."footer.php";?>
<script src="new_serial_order_script.js"></script>
<script>
// date picker
$('#order_date').datepicker({
  autoclose: true,
  format: 'yyyy/mm/dd'
});

$('.print_sales_items').on('click', function() {
  window.print();
})
</script>
</body>

</html>