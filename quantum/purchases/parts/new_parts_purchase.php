<?php //error_reporting(E_ALL & ~E_NOTICE); ?>
<?php include '../../db_config.php';  ?>
<?php $global_url="../../"; ?>
<?php include "../../authenticate.php" ?>
<?php 

  // DISPLAYING SUPPLIERS
  $display_suppliers_query = mysqli_query($conn,"select * from tbl_suppliers order by name")
  or die('Error:: ' . mysqli_error($conn));

  // NEW PURCHASE ID
  $new_pur_id_query = mysqli_query($conn,"Select max(purchase_id) from 
  tbl_parts_purchases")
  or die('Error:: ' . mysqli_error($conn));
  $order_id_result = mysqli_fetch_assoc($new_pur_id_query);
  $new_id = $order_id_result['max(purchase_id)'] + 1;
  $new_pur_id = $new_id;

  $curr_date = date("Y-m-d");
  
   // fetch trays
  $fetch_trays = mysqli_query($conn,"select * from tbl_trays");
 
  // *********
  // SUBMIT PURCHASE
  // *********
  if(isset($_POST['submit_purchase'])){

    // print_r($_POST['item_code']);
    // die();

    $date = str_replace("/", "-", $_POST['purchase_date']);
    $supplier_id = $_POST['purchase_supplier'];
    $user_id = $_SESSION['user_id'];


    // INSERT TO PURCHASE INVENTORY TBL
    for($i = 0;$i<count($_POST['item_code']);$i++){

      // INSERT TO PURCHASE TBL
      $new_purchase_query = mysqli_query($conn,"insert into tbl_parts_purchases (
        purchase_id,
        supplier_id,
        product_id,
        item_qty,
        date,
        user_id,
        tray_id,
        po_ref
        ) values(
          '".$new_pur_id."',
          '".$supplier_id."',
          ".$_POST['item_code'][$i].",
          ".$_POST['item_qty'][$i].",
          '".$date."',
          ".$user_id.",
          '".$_POST['tray_id']."',
          '".$_POST['po_ref']."')")
        or die('Error:: ' . mysqli_error($conn));

        
      // UPDATE PRODUCT
      $new_product_query = mysqli_query($conn,"update tbl_parts_products 
      set item_qty = item_qty + ".$_POST['item_qty'][$i]." where 
      id=".$_POST['item_code'][$i])
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
        'PP-".$new_pur_id."',
        'NEW PARTS PURCHASE',
        'QTY:".$_POST['item_qty'][$i]."',
        '".$date."',
        ".$user_id.",
        '".$_POST['item_code'][$i]."'
        )")
        or die('Error:: ' . mysqli_error($conn));

    }//LOOP ENDED

    // header("location:parts_purchase_details.php?pur_id=".$new_pur_id."&email=1");

  }

?>
<?php include "../../header.php" ?>

  <!-- Content Wrapper. Contains page content -->
  <div class="content-wrapper">
    <!-- Content Header (Page header) -->
    <section class="content-header">
      <h1>
      New Purchase# <?php echo $new_pur_id;?>
      </h1>
    </section>

    <!-- Main content -->
    <section class="content">
      <div class="row">

      <!-- col -->
      <form enctype="multipart/form-data" method="post" id="confirm_purchase" action="">
      <div class="col-md-12">
        <!-- box started-->
          <div class="box box-warning">
            <div class="box-body">

              <label for="" class="col col-md-4 col-sm-6">
                Date
                <input type="text" name="purchase_date" 
                class="form-control purchase_date" id="purchase_date"
                value="<?php echo $curr_date; ?>">
              </label>

              <div class="col-md-4">
                <div class="form-group">
                  <label>Select Supplier</label>
                  <select required class="form-control purchase_supplier" name="purchase_supplier" style="width: 100%;">
                    <option value="">Select Supplier</option>
                    <?php while($row = mysqli_fetch_assoc($display_suppliers_query)):?>
                    <option value="<?php echo $row['supplier_id']; ?>">
                    <?php echo $row['name']; ?> </option>
                  <?php endwhile; ?>
                  </select>
                </div>
              </div>

              <label for="" class="col col-md-4 col-sm-6">
                Select Tray
                <div class="form-group">
                <select required class="form-control select2 qc_required" name="tray_id">
                  <option value="">select</option>
                    <?php 
                    $fetch_trays = mysqli_query($conn,"select * from tbl_trays");
                    while($item = mysqli_fetch_assoc($fetch_trays)):?>
                    <option value="<?php echo $item['tray_id'];?>" >
                    <?php echo $item['title']; ?></option>
                  <?php endwhile;?>
                </select>
                </div>
              </label>

              <label for="" class="col col-md-4 col-sm-6">
                PO Reference
                <input type="text" name="po_ref" class="form-control po_ref" 
                id="po_ref">
              </label>

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
              <table class="table" id="purchase_items">
                  <thead>
                    <tr>
                      <th>Brand</th>
                      <th>Item Code</th>
                      <th>TACs</th>
                      <th>Qty</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <select name="item_brand[]"  class="brand-field form-control">
                          <option value="">Select</option>
                          <?php 
                            $fetch_brands = mysqli_query($conn,"select * from tbl_categories");
                            while($row1 = mysqli_fetch_assoc($fetch_brands)):
                          ?>
                          <option value="<?php echo $row1['category_id'];?>"><?php echo $row1['title'];?></option>
                          <?php endwhile;?>
                        </select>
                      </td>
                      <td>
                        <select class='code-field form-control' required name='item_code[]'>
                          <option value="">Select</option>
                        </select>        
                      </td>
                      <td >
                        <div class="item-tacs" style="display:flex; flex-wrap:wrap; max-width:300px;"></div>
                      </td>
                      <td>
                        <input type="number" name="item_qty[]"  placeholder="Item qty" 
                        class="form-control item_qty">
                      </td>
                      <td>
                        <!-- <button class="del_row btn btn-danger"><i class="fa fa-close"></i></button>   -->
                      </td>
                    </tr>
                    <tr class="add_new_row">
                      <td colspan="5">
                        <button type="button" class="btn btn-primary btn-block add_row">
                          <i class="fa fa-plus"></i> &nbsp;Add Item
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
            </div>
          </div>
        </div>
        <!-- /.col -->

      <div class="col-md-12">
        <button class="btn btn-primary btn-lg booking-completed pull-right">Booking Completed</button>
        <input type="submit" name="submit_purchase" class="submit-form btn btn-success btn-lg pull-right" 
        value="Confirm Purchase" id="submit_purchase">
      </div>

      </form>
    </div>
    <!-- /.row -->
  </section>
  <!-- /.content -->

  </div>
  <!-- /.content-wrapper -->

  <!-- error beep -->
  <audio id="myAudio">
    <source src="../../error-beep.mp3" type="audio/mp3">
      Your browser does not support the audio element.
  </audio>
  <!-- /error beep -->

  <select class="hide tray_collection no-print">
    <?php 
      while($tray = mysqli_fetch_assoc($fetch_trays)):
    ?>
      <option value="<?php echo $tray['tray_id'];?>">
        <?php echo $tray['tray_id'];?>        
      </option>
    <?php endwhile;?>
  </select>


<?php include $global_url."footer.php";?>
<script src="new_parts_purchase_script.js"></script>
<script>
 // date picker
  $('#purchase_date').datepicker({
    autoclose: true,
    format:'yyyy/mm/dd'
  });

</script>
</body>
</html>