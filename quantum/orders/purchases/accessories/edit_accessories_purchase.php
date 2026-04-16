<?php //error_reporting(E_ALL & ~E_NOTICE); ?>
<?php include '../../db_config.php';  ?>
<?php $global_url="../../"; ?>
<?php include "../../authenticate.php" ?>
<?php 

  // PURCHASE DETAILS
  $new_pur_id = $_GET['pur_id'];
  $purchase_details_query = mysqli_query($conn,"select * from tbl_accessories_purchases 
  where purchase_id='".$new_pur_id."'")
  or die('Error:: ' . mysqli_error($conn));
  $purchase_details = mysqli_fetch_assoc($purchase_details_query);

  // DISPLAYING SUPPLIERS
  $display_suppliers_query = mysqli_query($conn,"select * from tbl_suppliers order by name")
  or die('Error:: ' . mysqli_error($conn));

  $curr_date = date("Y-m-d");

  // fetch trays
  $fetch_trays = mysqli_query($conn,"select * from tbl_trays");

  // *********
  // SUBMIT PURCHASE
  // *********
  if(isset($_POST['submit_purchase'])){

    $date = $purchase_details['date'];
    $supplier_id = $_POST['purchase_supplier'];
    $user_id = $_SESSION['user_id'];


    // UPDATE ITEM QTY
    $fetch_prev_items = mysqli_query($conn,"select * from tbl_accessories_purchases 
    where purchase_id = '".$new_pur_id."'")
    or die('Error:: ' . mysqli_error($conn));

    while($item = mysqli_fetch_assoc($fetch_prev_items)){
      $update_items = mysqli_query($conn,"update tbl_accessories_products 
      set item_qty = item_qty - ".$item['item_qty']." where 
      id = ".$item['product_id'])
      or die('Error:: ' . mysqli_error($conn));
    }

    // DEL PREV ENTRIES
    $fetch_prev_items = mysqli_query($conn,"delete from tbl_accessories_purchases 
    where purchase_id = '".$new_pur_id."'")
    or die('Error:: ' . mysqli_error($conn));


    // INSERT TO PURCHASE INVENTORY TBL
    for($i = 0; $i<count($_POST['item_code']); $i++){
      
     // INSERT TO PURCHASE TBL
      $new_purchase_query = mysqli_query($conn,"insert into tbl_accessories_purchases (
        purchase_id,
        supplier_id,
        product_id,
        item_qty,
        date,
        user_id,
        tray_id,
        po_ref) 
        values(
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
      $new_product_query = mysqli_query($conn,"update tbl_accessories_products 
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
        'AP-".$new_pur_id."',
        'EDIT ACCESSORIES PURCHASE',
        'QTY:".$_POST['item_qty'][$i]."',
        '".$date."',
        ".$user_id.",
        '".$_POST['item_code'][$i]."'
        )")
        or die('Error:: ' . mysqli_error($conn));

    }//LOOP ENDED
    


    header("location:accessories_purchase_details.php?pur_id=".$new_pur_id."&email=1");

  }

?>
<?php include "../../header.php" ?>

  <!-- Content Wrapper. Contains page content -->
  <div class="content-wrapper">
    <!-- Content Header (Page header) -->
    <section class="content-header">
      <h1>
        Edit Purchase# <?php echo $new_pur_id;?>
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
                value="<?php echo $purchase_details['date']; ?>">
              </label>

              <div class="col-md-4">
                <div class="form-group">
                  <label>Select Supplier</label>
                  <select required class="form-control select2" name="purchase_supplier" style="width: 100%;">
                    <option value="">Select Supplier</option>
                    <?php while($row = mysqli_fetch_assoc($display_suppliers_query)):?>
                    <option value="<?php echo $row['supplier_id']; ?>" 
                    <?php echo $purchase_details['supplier_id'] == $row['supplier_id'] ? 'selected':''; ?>>
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
                    <option value="<?php echo $item['tray_id'];?>"
                    <?php echo $purchase_details['tray_id'] === $item['tray_id'] ? 'selected':'';?>
                    ><?php echo $item['title']; ?></option>
                  <?php endwhile;?>
                </select>
                </div>
              </label>

              <label for="" class="col col-md-4 col-sm-6">
                PO Reference
                <input type="text" name="po_ref" class="form-control po_ref" 
                id="po_ref" value="<?php echo $purchase_details['po_ref']; ?>">
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
                      <th>Qty</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <?php 
                      $no = 1;
                      $product_details_query = mysqli_query($conn,"select 
                      distinct pr.product_id,
                      pr.purchase_id,
                      pr.date,
                      pr.item_qty,
                      pr.supplier_id,
                      pd.item_brand,
                      pd.title,
                      pd.id
                      from 
                      tbl_accessories_purchases as pr inner join tbl_accessories_products as pd 
                      on pd.id = pr.product_id 
                      where pr.purchase_id='".$new_pur_id."' 
                      order by pr.id")
                      or die('Error:: ' . mysqli_error($conn));
                      while($row = mysqli_fetch_assoc($product_details_query)):
                    ?>
                    <tr>
                      <td>
                        <select name="item_brand[]"  class="brand-field form-control">
                          <option value="">Select</option>
                          <?php 
                            $fetch_brands = mysqli_query($conn,"select * from tbl_categories");
                            while($brands = mysqli_fetch_assoc($fetch_brands)):
                          ?>
                            <option value="<?php echo $brands['category_id'];?>"
                            <?php echo $row['item_brand'] == $brands['category_id'] ? 'selected':''; ?>>
                                <?php echo $brands['title'];?>
                            </option>
                          <?php endwhile;?>
                        </select>
                      </td>
                      <td>
                        <select name="item_code[]"  class="code-field form-control">
                          <option value="">Select</option>
                          <?php 
                            $fetch_products = mysqli_query($conn,"select * from tbl_accessories_products 
                            where item_brand = '".$row['item_brand']."'");
                            while($products = mysqli_fetch_assoc($fetch_products)):
                          ?>
                            <option value="<?php echo $products['id'];?>"
                            <?php echo $row['product_id'] == $products['id'] ? 'selected':''; ?>>
                                <?php echo $products['title'];?>
                            </option>
                          <?php endwhile;?>
                        </select>
                      </td>
                      <td>
                        <input type="number" name="item_qty[]"  placeholder="Item qty" 
                        value="<?php echo $row['item_qty']; ?>" class="form-control">
                      </td>
                      <td>
                        <?php if($no != 1):?>
                        <button class="del_row btn btn-danger"><i class="fa fa-close"></i></button>  
                        <?php endif; ?>
                      </td>
                    </tr>
                    <?php $no++; ?>
                    <?php endwhile;?>
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
<!-- page script -->
<script src="new_accessories_purchase_script.js"></script>
<script>
 // date picker
  $('#purchase_date').datepicker({
    autoclose: true,
    format:'yyyy/mm/dd'
  });

</script>
</body>
</html>