<?php //error_reporting(E_ALL & ~E_NOTICE); ?>
<?php include '../../db_config.php';  ?>
<?php $global_url="../../"; ?>
<?php include "../../authenticate.php" ?>
<?php 

  // PURCHASE ID
  $pur_id = $_GET['ret'];

  // NEW RETURN  ID
  $new_pur_id_query = mysqli_query($conn,"Select max(return_id) from 
  tbl_parts_purchase_return")
  or die('Error:: ' . mysqli_error($conn));
  $order_id_result = mysqli_fetch_assoc($new_pur_id_query);
  $new_id = $order_id_result['max(return_id)'] + 1;
  $new_ret_id = $new_id;


  // Fetch order details
  $get_purchase_query = mysqli_query($conn,"Select * from tbl_parts_purchases 
  where purchase_id='".$pur_id."'")
  or die('Error:: ' . mysqli_error($conn));
  $get_purchase = mysqli_fetch_assoc($get_purchase_query);

  // Fetch suppliers
  $get_supplier_query = mysqli_query($conn,"Select * from tbl_suppliers 
  where supplier_id='".$get_purchase['supplier_id']."'")
  or die('Error:: ' . mysqli_error($conn));
  $get_supplier = mysqli_fetch_assoc($get_supplier_query);

  $curr_date = date("Y-m-d");
  
  // *********
  // SUBMIT PURCHASE
  // *********
  if(isset($_POST['submit_purchase'])){

    $date = str_replace("/", "-", $_POST['purchase_date']);
    $user_id = $_SESSION['user_id'];

    // INSERT TO PURCHASE INVENTORY TBL
    for($i = 0;$i<count($_POST['item_code']);$i++){
      
      if($_POST['item_qty'][$i] > 0){
        // INSERT TO PURCHASE TBL
        $new_purchase_query = mysqli_query($conn,"insert into 
        tbl_parts_purchase_return (
          return_id,
          product_id,
          item_qty,
          date,
          purchase_id,
          user_id) values(
            '".$new_ret_id."',
            ".$_POST['item_code'][$i].",
            ".$_POST['item_qty'][$i].",
            '".$date."',
            '".$pur_id."',
            ".$user_id.")")
          or die('Error:: ' . mysqli_error($conn));
          
          // UPDATE PRODUCTS QTY
          $new_product_query = mysqli_query($conn,"update tbl_parts_products 
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
          'PPR-".$new_ret_id."',
          'PARTS PURCHASE RETURN',
          'QTY:".$_POST['item_qty'][$i]."',
          '".$date."',
          ".$user_id.",
          '".$_POST['item_code'][$i]."'
          )")
          or die('Error:: ' . mysqli_error($conn));
      }

    }//LOOP ENDED

    header("location:parts_purchase_return_details.php?ret_id=".$new_ret_id."&email=1");

  }

?>

<?php include "../../header.php" ?>

  <!-- Content Wrapper. Contains page content -->
  <div class="content-wrapper">
    <!-- Content Header (Page header) -->
    <section class="content-header">
      <h1>
        New Purchase Return #APR-<?php echo $pur_id;?>
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
                <label>Supplier</label>
                <p><?php echo $get_supplier['name'];?></p>
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
              <table class="table" id="purchase_items">
                  <thead>
                    <tr>
                      <th>Brand</th>
                      <th>Item / Details</th>
                      <th>Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    <?php 
                    $purchase_query = mysqli_query($conn,"Select * from tbl_parts_purchases 
                    where purchase_id='".$pur_id."'")
                    or die('Error:: ' . mysqli_error($conn));
                    while($row = mysqli_fetch_assoc($purchase_query)):
                    ?>
                    <tr>
                      <td>
                        <?php 
                          $fetch_brands_query = mysqli_query($conn,"select 
                          ct.title,
                          ct.category_id,
                          pr.id
                          from tbl_parts_products as pr
                          inner join tbl_categories as ct on pr.item_brand = ct.category_id 
                          where pr.id=".$row['product_id'])
                          or die('Error:: ' . mysqli_error($conn));
                          $fetch_brands = mysqli_fetch_assoc($fetch_brands_query);
                        ?>
                        <?php echo $fetch_brands['title'];?>
                      </td>
                      <td>
                      <?php 
                          $fetch_products_query = mysqli_query($conn,"select 
                          title, id from tbl_parts_products as pt where 
                          id=".$row['product_id'])
                          or die('Error:: ' . mysqli_error($conn));
                          $fetch_products = mysqli_fetch_assoc($fetch_products_query);
                        ?>
                        <input type="text" name="item_code[]"  
                        placeholder="Item qty" class="item_code form-control hidden"
                        value="<?php echo $fetch_products['id']; ?>">
                        <?php echo $fetch_products['title'];?>
                      </td>
                      <td>

                        <!-- see available qty (those which are not pickedup in repair module) -->
                        <?php
                        $fetch_qty_query = mysqli_query($conn,"select 
                          item_qty
                          from tbl_parts_products 
                          where id=".$row['product_id'])
                          or die('Error:: ' . mysqli_error($conn));
                          $fetch_qty = mysqli_fetch_assoc($fetch_qty_query);

                        // subtract returned qty from purchased qty 
                         $get_return_query = mysqli_query($conn,"select * from 
                        tbl_parts_purchase_return where 
                        product_id=".$row['product_id']." and 
                        purchase_id='".$pur_id."'");                        
                        ?>
                        <?php $get_return = mysqli_fetch_assoc($get_return_query); 
                        
                        // if stock is less then use stock otherwise use purchaseQty 
                        $qty = $fetch_qty['item_qty'] > $row['item_qty'] ? $row['item_qty']:$fetch_qty['item_qty'];
                        ?>

                        <input type="number" name="item_qty[]"  
                        placeholder="Item qty" class="item_qty form-control" 
                        value="">
                        <p style="font-size:13px;" class="available_items">Available Qty: 
                        <span><?php echo $qty- $get_return['item_qty'] > 0 ? $qty- $get_return['item_qty'] : 0; ?></span></p>
                      </td>
                    </tr>
                    <?php endwhile;?>
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


<?php include $global_url."footer.php";?>

<script src="parts_purchase_return_script.js"></script>
<script>
 // date picker
  $('#purchase_date').datepicker({
    autoclose: true,
    format:'yyyy/mm/dd'
  });

</script>
</body>
</html>