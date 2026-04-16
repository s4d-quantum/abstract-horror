<?php //error_reporting(E_ALL & ~E_NOTICE); ?>
<?php include '../../db_config.php';  ?>
<?php $global_url="../../"; ?>
<?php include "../../authenticate.php" ?>
<?php 

  // order ID
  $ord_id = $_GET['ret'];

  // NEW RETURN  ID
  $new_ord_id_query = mysqli_query($conn,"Select max(return_id) from 
  tbl_accessories_order_return")
  or die('Error:: ' . mysqli_error($conn));
  $order_id_result = mysqli_fetch_assoc($new_ord_id_query);
  $new_id = $order_id_result['max(return_id)'] + 1;
  $new_ret_id = $new_id;

  // Fetch order details
  $get_order_query = mysqli_query($conn,"Select * from tbl_accessories_orders 
  where order_id='".$ord_id."'")
  or die('Error:: ' . mysqli_error($conn));
  $get_order = mysqli_fetch_assoc($get_order_query);

  // Fetch customers
  $get_customer_query = mysqli_query($conn,"Select * from tbl_customers 
  where customer_id='".$get_order['customer_id']."'")
  or die('Error:: ' . mysqli_error($conn));
  $get_customer = mysqli_fetch_assoc($get_customer_query);

  $curr_date = date("Y-m-d");
  
  // *********
  // SUBMIT order
  // *********
  if(isset($_POST['submit_order'])){

    $date = str_replace("/", "-", $_POST['order_date']);
    $user_id = $_SESSION['user_id'];


    // INSERT TO order INVENTORY TBL
    for($i = 0;$i<count($_POST['item_code']);$i++){

      // if item was returned with qty > 0
      if($_POST['item_qty'][$i] > 0){

        // INSERT TO order TBL
        $new_order_query = mysqli_query($conn,"insert into 
        tbl_accessories_order_return (
          return_id,
          product_id,
          item_qty,
          date,
          order_id,
          user_id) values(
            '".$new_ret_id."',
            ".$_POST['item_code'][$i].",
            ".$_POST['item_qty'][$i].",
            '".$date."',
            '".$ord_id."',
            ".$user_id.")")
          or die('Error:: ' . mysqli_error($conn));
          
          // UPDATE PRODUCTS QTY
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
          'AOR-".$new_ret_id."',
          'NEW ACCESSORIES ORDER RETURN',
          'QTY:".$_POST['item_qty'][$i]."',
          '".$date."',
          ".$user_id.",
          '".$_POST['item_code'][$i]."'
          )")
          or die('Error:: ' . mysqli_error($conn));

      }//IF ENDED

    }//LOOP ENDED

    header("location:accessories_order_return_details.php?ret_id=".$new_ret_id."&email=1");

  }

?>

<?php include "../../header.php" ?>

  <!-- Content Wrapper. Contains page content -->
  <div class="content-wrapper">
    <!-- Content Header (Page header) -->
    <section class="content-header">
      <h1>
        New order Return # AOR-<?php echo $ord_id;?>
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

              <label for="" class="col col-md-4 col-sm-6">
                Date
                <input type="text" name="order_date" 
                class="form-control order_date" id="order_date"
                value="<?php echo $curr_date; ?>">
              </label>

              <div class="col-md-4">
                <label>customer</label>
                <p><?php echo $get_customer['name'];?></p>
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
                      <th>Brand</th>
                      <th>Item / Details</th>
                      <th>Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    <?php 
                    $order_query = mysqli_query($conn,"Select * from tbl_accessories_orders 
                    where order_id='".$ord_id."'")
                    or die('Error:: ' . mysqli_error($conn));
                    while($row = mysqli_fetch_assoc($order_query)):
                    ?>
                    <tr>
                      <td>
                        <?php 
                          $fetch_brands_query = mysqli_query($conn,"select 
                          ct.title,
                          ct.category_id,
                          pr.id
                          from tbl_accessories_products as pr
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
                          title, id from tbl_accessories_products as pt where 
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
                        <!-- subtract returned qty from orderd qty -->
                        <?php $get_return_query = mysqli_query($conn,"select * from 
                        tbl_accessories_order_return where 
                        product_id=".$row['product_id']." and 
                        order_id='".$ord_id."'") ?>
                        <?php $get_return = mysqli_fetch_assoc($get_return_query); ?>

                        <input type="number" name="item_qty[]"  
                        placeholder="Item qty" class="item_qty form-control"
                        value="<?php echo $row['item_qty'] - $get_return['item_qty']; ?>">
                        <p style="font-size:13px;" class="available_items">Ordered Qty: 
                        <span><?php echo $row['item_qty']- $get_return['item_qty']; ?></span></p>
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

  <!-- error beep -->
  <audio id="myAudio">
    <source src="../../error-beep.mp3" type="audio/mp3">
      Your browser does not support the audio element.
  </audio>
  <!-- /error beep -->



<?php include $global_url."footer.php";?>
<script src="new_accessories_order_script.js"></script>
<script>
 // date picker
  $('#order_date').datepicker({
    autoclose: true,
    format:'yyyy/mm/dd'
  });

  let validQty = true;
  $('.item_qty').on('change',function(){
    let available = parseInt($(this).siblings('p').children('span').html());
    if($(this).val() > available || $(this).val() <= 0){
      validQty = false;
    }
    else{
      validQty = true;
    }
  });

  $('.submit-form').on('click',function(e){
    if(!validQty){
      e.preventDefault();
      alert('Item quantity Invalid!')
    }
    else{

    }
  })


</script>
</body>
</html>