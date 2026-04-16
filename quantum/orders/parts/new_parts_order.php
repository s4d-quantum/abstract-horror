<?php //error_reporting(E_ALL & ~E_NOTICE); ?>
<?php include '../../db_config.php';  ?>
<?php $global_url="../../"; ?>
<?php include "../../authenticate.php" ?>
<?php 

  // DISPLAYING customerS
  $display_customers_query = mysqli_query($conn,"select * from tbl_customers order by name")
  or die('Error:: ' . mysqli_error($conn));

  // NEW order ID
  $new_ord_id_query = mysqli_query($conn,"Select max(order_id) from tbl_parts_orders")
  or die('Error:: ' . mysqli_error($conn));
  $order_id_result = mysqli_fetch_assoc($new_ord_id_query);

  $new_id = $order_id_result['max(order_id)'] + 1;
  // if($order_id_result['max(order_id)'] == 0) {
  //   $new_id = 2884;
  // }
  // else{
  //   $new_id = $order_id_result['max(order_id)'] + 1;
  // }

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
      $new_order_query = mysqli_query($conn,"insert into tbl_parts_orders (
      order_id,
      customer_id,
      product_id,
      item_qty,
      date,
      linked_pid,
      user_id) values(
        '".$new_ord_id."',
        '".$customer_id."',
        ".$_POST['item_code'][$i].",
        ".$_POST['item_qty'][$i].",
        '".$date."',
        ".$_POST['linked_pid'].",
        ".$user_id.")")
      or die('Error:: ' . mysqli_error($conn));
      
      // UPDATE PRODUCT
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
      'PO-".$new_ord_id."',
      'NEW PARTS ORDER',
      'QTY:".$_POST['item_qty'][$i]."',
      '".$date."',
      ".$user_id.",
      '".$_POST['item_code'][$i]."'
      )")
      or die('Error:: ' . mysqli_error($conn));

      
  }//LOOP ENDED

    header("location:parts_order_details.php?ord_id=".$new_ord_id."&email=1");

  }

?>
<?php include "../../header.php" ?>

  <!-- Content Wrapper. Contains page content -->
  <div class="content-wrapper">
    <!-- Content Header (Page header) -->
    <section class="content-header">
      <h1>
      New Order# PO-<?php echo $new_ord_id;?>
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
                  value="<?php echo $curr_date; ?>">
                </label>

                <div class="col-md-4">
                  <div class="form-group">
                    <label>Select customer</label>
                    <select required class="form-control order_customer" name="order_customer" style="width: 100%;">
                      <option value="">Select customer</option>
                      <?php while($row = mysqli_fetch_assoc($display_customers_query)):?>
                      <option value="<?php echo $row['customer_id']; ?>">
                      <?php echo $row['name']; ?> </option>
                    <?php endwhile; ?>
                    </select>
                  </div>
                </div>
              </div>

              <div class="row">
                <div class="po-box col-md-3 col-sm-4">
                  <label for="">PID</label>
                  <input type="number" name="linked_pid" class="linked_pid form-control" required>
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
                      <th>Brand</th>
                      <th>Model</th>
                      <th>Part</th>
                      <th>Qty</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <select name="item_brand[]"  class="brand-field form-control" required>
                          <option value="">Select Brand</option>
                          <?php 
                            $fetch_brands = mysqli_query($conn,"select * from tbl_categories");
                            while($row = mysqli_fetch_assoc($fetch_brands)):
                          ?>
                          <option value="<?php echo $row['category_id'];?>"><?php echo $row['title'];?></option>
                          <?php endwhile;?>
                        </select>
                      </td>
                      <td>
                        <select name="item_model[]" class="form-control model-field" required>
                          <option value="">Select Model</option>
                        </select>
                      </td>
                      <td>
                        <select name="item_code[]" class="form-control code-field" required>
                          <option value="">Select Part</option>
                        </select>
                      </td>
                      <td>
                        <div class="form-group">
                          <input type="number" name="item_qty[]"  
                          placeholder="Item qty" class="item_qty form-control"
                          required>
                          <p style="font-size:13px;" class="available_items">Available Qty: 
                          <span>0</span></p>
                        </div>
                      </td>
                      <td>
                        <!-- <button class="del_row btn btn-danger"><i class="fa fa-close"></i></button>   -->
                      </td>
                    </tr>
                    <tr class="add_new_row">
                      <td colspan="6">
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
<script src="new_parts_order_script.js"></script>
<script>
 // date picker
  $('#order_date').datepicker({
    autoclose: true,
    format:'yyyy/mm/dd'
  });

  // check if item qty is less or greater then available qty
  $(document).on('keyup','.item_qty',function(){
    let availableQty = parseInt($(this).siblings('.available_items').children('span').html());
    console.log($(this).val());
    console.log(availableQty);
    if($(this).val() > availableQty || $(this).val() <= 0){
      $(this).parent().addClass('has-error');
    }
    else{
      $(this).parent().removeClass('has-error');
    }
  });

  $('.submit-form').on('click',function(e){
    let errorCount = $('.has-error').length;
    if(errorCount > 0){
      e.preventDefault();
      alert('Item quantity not valid')
    }
  });

  // Fetch available product qty
  $(document).on('change','.code-field',function(){
    let productId = $(this).val();
    let that = $(this);
    $.ajax({
      'type': "POST",
      'url': "includes/fetch_product_qty.php",
      'data': {
        productId
      },
      'success': function (data) {
        let D = JSON.parse(data)[0];
        let qty = D.item_qty;
        console.log(D);
        that.parent().siblings().find('.available_items').children('span').html(qty);
        // console.log(that.parent().siblings().find('.available_items'));
      }
    });

  });

</script>
</body>
</html>