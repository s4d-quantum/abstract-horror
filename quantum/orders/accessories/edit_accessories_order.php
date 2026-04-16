<?php //error_reporting(E_ALL & ~E_NOTICE); ?>
<?php include '../../db_config.php';  ?>
<?php $global_url="../../"; ?>
<?php include "../../authenticate.php" ?>
<?php 

    // order DETAILS
    $new_ord_id = $_GET['ord_id'];
    $order_details_query = mysqli_query($conn,"select * from tbl_accessories_orders 
    where order_id='".$new_ord_id."'")
    or die('Error:: ' . mysqli_error($conn));
    $order_details = mysqli_fetch_assoc($order_details_query);

    // DISPLAYING customerS
    $display_customers_query = mysqli_query($conn,"select * from tbl_customers order by name")
    or die('Error:: ' . mysqli_error($conn));

    $curr_date = date("Y-m-d");
  
  // *********
  // SUBMIT order
  // *********
  if(isset($_POST['submit_order'])){

    $date = str_replace("/", "-", $_POST['order_date']);
    $customer_id = $_POST['order_customer'];
    $user_id = $_SESSION['user_id'];


    // UPDATE ITEM QTY
    $fetch_prev_items = mysqli_query($conn,"select * from tbl_accessories_orders 
    where order_id = '".$new_ord_id."'")
    or die('Error:: ' . mysqli_error($conn));

    while($item = mysqli_fetch_assoc($fetch_prev_items)){
      $update_items = mysqli_query($conn,"update tbl_accessories_products 
      set item_qty = item_qty + ".$item['item_qty']." where 
      id = ".$item['product_id'])
      or die('Error:: ' . mysqli_error($conn));
    }

    // DEL PREV ENTRIES
    $fetch_prev_items = mysqli_query($conn,"delete from tbl_accessories_orders 
    where order_id = '".$new_ord_id."'")
    or die('Error:: ' . mysqli_error($conn));


    // INSERT TO order INVENTORY TBL
    for($i = 0;$i<count($_POST['item_code']);$i++){
      // INSERT TO order TBL
      $new_order_query = mysqli_query($conn,"insert into tbl_accessories_orders (
        order_id,
        customer_id,
        product_id,
        item_qty,
        date,
        po_box,
        delivery_company,
        user_id,
        total_pallets,
        total_boxes) values(
          '".$new_ord_id."',
          '".$customer_id."',
          ".$_POST['item_code'][$i].",
          ".$_POST['item_qty'][$i].",
          '".$date."',
          '".$_POST['po_box']."',
          '".$_POST['delivery_company']."',
          ".$user_id.",
          ".$_POST['total_pallets'].",
          ".$_POST['total_boxes']."
          )")
        or die('Error:: ' . mysqli_error($conn));
        
        // UPDATE PRODUCT
        $new_product_query = mysqli_query($conn,"update tbl_accessories_products 
        set item_qty = item_qty - ".$_POST['item_qty'][$i]." where 
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
        'AO-".$new_ord_id."',
        'EDIT ACCESSORIES ORDER',
        'QTY:".$_POST['item_qty'][$i]."',
        '".$date."',
        ".$user_id.",
        '".$_POST['item_code'][$i]."'
        )")
        or die('Error:: ' . mysqli_error($conn));

    }//LOOP ENDED
    

    header("location:accessories_order_details.php?ord_id=".$new_ord_id."&email=1");

  }

?>

<?php include "../../header.php" ?>

  <!-- Content Wrapper. Contains page content -->
  <div class="content-wrapper">
    <!-- Content Header (Page header) -->
    <section class="content-header">
      <h1>
        Edit order# AO-<?php echo $new_ord_id;?>
      </h1>
    </section>

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
                  <input type="text" name="order_date" 
                  class="form-control order_date" id="order_date"
                  value="<?php echo $order_details['date']; ?>">
                </label>

                <div class="col-md-4">
                  <div class="form-group">
                    <label>Select customer</label>
                    <select required class="form-control order_customer" name="order_customer" style="width: 100%;">
                      <option value="">Select customer</option>
                      <?php while($row = mysqli_fetch_assoc($display_customers_query)):?>
                      <option value="<?php echo $row['customer_id']; ?>" 
                      <?php echo $order_details['customer_id'] == $row['customer_id'] ? 'selected':''; ?>>
                      <?php echo $row['name']; ?> </option>
                    <?php endwhile; ?>
                    </select>
                  </div>
                </div>
              </div>

              <div class="row">
                <div class="po-box col-md-3 col-sm-4">
                  <label for="">Total # of Boxes</label>
                  <input type="number" name="total_boxes" class="total_boxes form-control" 
                  value="<?php echo $order_details['total_boxes']; ?>" required>
                </div>

                <div class="po-box col-md-3 col-sm-4">
                  <label for="">Total # of Pallets</label>
                  <input value="<?php echo $order_details['total_pallets']; ?>" 
                  type="number" name="total_pallets" class="total_pallets form-control" required>
                </div>

                <!-- PO Box -->
                <div class="po-box col-md-3 col-sm-4">
                  <label for="">PO Reference</label>
                  <input value="<?php echo $order_details['po_box']; ?>" 
                  type="text" name="po_box" class="form-control">
                </div>

                <!-- Delivery Company -->
                <div class="deliver-company col-md-3 col-sm-4">
                  <label for="">Delivery Company</label>
                  <input value="<?php echo $order_details['delivery_company']; ?>" 
                  type="text" name="delivery_company" class="form-control">
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
                      <th>Item Category</th>
                      <th>Brand</th>
                      <th>Qty</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <?php 
                      $no = 1;
                      $product_details_query = mysqli_query($conn,"select 
                      distinct pr.product_id,
                      pr.order_id,
                      pr.date,
                      pr.item_qty,
                      pr.customer_id,
                      pd.item_brand,
                      pd.title,
                      pd.id
                      from 
                      tbl_accessories_orders as pr inner join tbl_accessories_products as pd 
                      on pd.id = pr.product_id 
                      where pr.order_id='".$new_ord_id."' order by 
                      pr.id")
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


<?php include $global_url."footer.php";?>
<script src="edit_accessories_order_script.js"></script>
<script>
 // date picker
  $('#order_date').datepicker({
    autoclose: true,
    format:'yyyy/mm/dd'
  });

</script>
</body>
</html>