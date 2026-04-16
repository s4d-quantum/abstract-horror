<?php include '../../db_config.php';  ?>
<?php $global_url="../../"; ?>
<?php include "../../authenticate.php" ?>
<?php include "../../csrf_protection.php" ?>
<?php 

  // fetch suppliers
  $fetch_customers = mysqli_query($conn,"select * from tbl_customers order by name");

  // fetch brands/categories
  $fetch_categories = mysqli_query($conn,"select * from tbl_categories")
  or die('Error:: ' . mysqli_error($conn));

  // NEW order ID
  $new_order_id = $_GET['ord_id'];

  // fetch sales order id
  $fetch_sales_id = mysqli_query($conn,"select order_id as sales_order_id from tbl_imei_sales_orders where 
  goodsout_order_id=".$new_order_id)
  or die('Error:: ' . mysqli_error($conn));
  $sales_id = mysqli_fetch_assoc($fetch_sales_id);

  // fetch order_details
  $fetch_ord = mysqli_query($conn,"select * from tbl_orders where 
  order_id='".$new_order_id."'")
  or die('Error:: ' . mysqli_error($conn));

  $prev_data = mysqli_fetch_assoc($fetch_ord);

  if(isset($_POST['submit_btn'])){

    // SECURITY FIX: Validate CSRF token
    if (!validate_csrf_token()) {
      die('Error: Invalid CSRF token. Please refresh the page and try again.');
    }

    // VALIDATION FIX: Ensure items are provided
    if (!isset($_POST['imei_field']) || !is_array($_POST['imei_field']) || count($_POST['imei_field']) == 0) {
      die('Error: No items provided. Please add at least one item to the order.');
    }

    // Validate all IMEIs are non-empty
    foreach ($_POST['imei_field'] as $imei) {
      if (empty(trim($imei))) {
        die('Error: One or more IMEI fields are empty. Please fill all IMEI fields.');
      }
    }

    $date = $prev_data['date'];
    $customer = $_POST['order_customer'];
    $user_id = $_SESSION['user_id'];


    // ===========
    // update prev data
    // ===========
    $fetch_order_items = mysqli_query($conn,"select * from 
    tbl_orders where 
    order_id = '".$new_order_id."'")
    or die('Error:: ' . mysqli_error($conn));
    $item_array= array();
    while($t = mysqli_fetch_assoc($fetch_order_items)){
      $item_array[] = array(
        'item_imei' => $t['item_imei']
      );
    
    }
    for($i = 0;$i<count($item_array);$i++){
      $update_prev_data = mysqli_query($conn,"update tbl_imei 
      set status = 1, in_sales_order = NULL where item_imei = '".$item_array[$i]['item_imei']."'")
      or die('Error:: ' . mysqli_error($conn));
    }


    // ===========
    // delete prev data
    // ===========
    // delete previous order entries
    $del_prev_entries = mysqli_query($conn,"delete from tbl_orders 
    where order_id='".$new_order_id."'")
    or die('Error:: ' . mysqli_error($conn));

    // ===========
    // insert new data
    // ===========
    for($i = 0;$i<count($_POST['imei_field']);$i++){
      // update tbl order
      $new_purchase = mysqli_query($conn,"insert into tbl_orders (
      customer_id,
      item_imei,
      date,
      order_id,
      order_return,
      po_box,
      delivery_company,
      total_pallets,
      total_boxes,
      user_id) 
      
      values(
      '".$customer."',
      '".$_POST['imei_field'][$i]."',
      '".$date."',
      '".$new_order_id."',
      ".$_POST['order_return'][$i].",
      '".$_POST['po_box']."',
      '".$_POST['delivery_company']."',
      '".$_POST['total_pallets']."',
      '".$_POST['total_boxes']."',
      ".$user_id.")")
      or die('Error:: ' . mysqli_error($conn));

      // SECURITY FIX: Don't trust status from form - recalculate from database
      // Fetch the actual current status of the item from database
      $check_item_status = mysqli_query($conn,"SELECT status, in_sales_order FROM tbl_imei
      WHERE item_imei = '".$_POST['imei_field'][$i]."'")
      or die('Error:: ' . mysqli_error($conn));
      $item_status_data = mysqli_fetch_assoc($check_item_status);

      // Determine new status: if item is being added to this goods out order, mark as sold (0)
      // Otherwise keep current status
      $new_status = 0; // Item is in goods out order, so status = 0 (sold)
      $in_sales_order_value = 'NULL';
      if ($new_status === 0 && isset($sales_id['sales_order_id'])) {
        $in_sales_order_value = intval($sales_id['sales_order_id']);
      }

      $imei_query = mysqli_query($conn,"update tbl_imei set
      status = ".$new_status.", in_sales_order = ".$in_sales_order_value." where
      item_imei = '".$_POST['imei_field'][$i]."'")
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
        'IO-".$new_order_id."',
        'EDIT IMEI ORDER',
        'QTY:1',
        '".$date."',
        ".$user_id.",
        '".$_POST['imei_field'][$i]."'
        )")
        or die('Error:: ' . mysqli_error($conn));

    }

    header("location:order_details.php?ord_id=".$new_order_id."&email=1");

  }
?>

<?php include "../../header.php";?>

  <!-- Content Wrapper. Contains page content -->
  <div class="content-wrapper">
    <!-- Content Header (Page header) -->
    <section class="content-header">
      <h1 class="pull-left">
        Edit Order #IO-<?php echo $new_order_id; ?>
      </h1>
      <button class="btn btn-success pull-right btn-lg add_accessories_btn" 
      data-toggle="modal" data-target="#download-modal"><i class="fa fa-search"></i>
      View Sales Items</button>
    </section>

    <!-- Main content -->
    <section class="content">
      <div class="row">
        <!-- Main content -->
        <div class="col-xs-12">
          <section class="content">
            <div class="row">
              <div class="col-xs-12">

              <form enctype="multipart/form-data" method="post" id="confirm_order" action="">
                <?php csrf_token_field(); ?>
                <div class="box">
                  <div class="box-header">
                    <h3 class="box-title">Details</h3>
                  </div>
                  <!-- /.box-header -->
                  <div class="box-body">
                    <div class="row">
                      <label for="" class="col col-md-4 col-sm-6">
                        Date
                        <input type="text" name="order_date" class="form-control order_date" 
                        value="<?php echo $prev_data['date']; ?>" id="order_date" required>
                      </label>

                      <div class="form-group col col-md-4 col-sm-6">
                        <label>Select Customer</label>
                        <select required class="form-control order_customer" name="order_customer" readonly>
                          <option value="">Select Customer</option>
                          <?php while($row = mysqli_fetch_assoc($fetch_customers)):?>
                          <option value="<?php echo $row['customer_id']; ?>" 
                          <?php echo $prev_data['customer_id'] === $row['customer_id'] ? 'selected' : ''?>>
                          <?php echo $row['name']; ?> </option>
                        <?php endwhile; ?>
                        </select>
                      </div>
                    </div>

                    <div class="row">

                      <div class="po-box col-md-3 col-sm-4">
                        <label for="">Total # of Boxes</label>
                        <input type="number" name="total_boxes" value="<?php echo $prev_data['total_boxes'];?>"
                         class="total_boxes form-control" required>
                      </div>

                      <div class="po-box col-md-3 col-sm-4">
                        <label for="">Total # of Pallets</label>
                        <input type="number" name="total_pallets" value="<?php echo $prev_data['total_pallets'];?>" 
                        class="total_pallets form-control" required>
                      </div>

                      <!-- PO Box -->
                      <div class="po-box col-md-3 col-sm-4">
                        <label for="">PO Reference</label>
                        <input type="text" name="po_box" class="form-control" value="<?php echo $prev_data['po_box'];?>">
                      </div>

                      <!-- Delivery Company -->
                      <div class="deliver-company col-md-3 col-sm-4">
                        <label for="">Delivery Company</label>
                        <input type="text" name="delivery_company" class="form-control" value="<?php echo $prev_data['delivery_company'];?>">
                      </div>
                    </div>

                  </div>
                  <!-- /.box-body -->
                </div>

                <div class="box">
                  <div class="box-header">
                    <h3 class="box-title">Items</h3>
                  </div>
                  <!-- /.box-header -->
                  <div class="box-body">
                    <table id="items_table" class="table table-bordered">
                      <thead>
                        <tr>
                          <th>IMEI</th>
                          <th>Model/Details</th>
                          <th>Brand</th>
                          <th>Grade</th>
                          <th>Color</th>
                          <th>GBs</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        <?php 
                          $na = 0;
                          $fetch_orders_query = mysqli_query($conn,"select 
                          DISTINCT ord.item_imei, 
                          im.item_gb, 
                          im.item_color,
                          im.status,  
                          im.item_grade,
                          tc.item_details,
                          tc.item_brand,
                          ord.customer_id, 
                          ord.order_return
                          from tbl_orders as ord 

                          inner join tbl_imei as im 
                          on im.item_imei = ord.item_imei 

                          inner join tbl_tac as tc 
                          on tc.item_tac = im.item_tac 

                          where ord.order_id 
                          = ".$new_order_id." order by 
                          ord.id")
                          or die('Error:: ' . mysqli_error($conn));
                          while($row = mysqli_fetch_assoc($fetch_orders_query)):
                        ?>
                        <tr>
                          <td>
                            <div class="form-group">
                              <input type="text" class="form-control imei-field" 
                              value="<?php echo $row['item_imei']?>" name="imei_field[]" required>
                              <span class="help-block"></span>
                            </div>
                          </td>
                          <td>
                            <input type="text" class="form-control details-field" 
                            value="<?php echo $row['item_details']?>" name="details_field[]" readonly>
                          </td>
                          <td>
                              <?php 
                              // fetch brands/categories
                              $fetch_categories = mysqli_query($conn,"select * from tbl_categories 
                              where category_id='".$row['item_brand']."'");
                              $item = mysqli_fetch_assoc($fetch_categories);
                              ?>
                              <input type="text" class="form-control brand-field" 
                              value="<?php echo $item['title']?>" name="brand_field[]" readonly>
                          </td>
                          <td>
                            <?php 
                              // fetch grade
                              $fetch_grades = mysqli_query($conn,"select title from tbl_grades 
                              where grade_id=".$row['item_grade']);
                              $grade = mysqli_fetch_assoc($fetch_grades);
                            ?>
                            <input type="text" class="form-control grade-field" 
                            value="<?php echo $grade['title']?>" name="grade_field[]" readonly>
                          </td>
                          <td>
                            <input type="text" class="form-control color-field" 
                            value="<?php echo $row['item_color']?>" name="color_field[]" readonly>
                          </td>
                          <td>
                            <input type="text" class="form-control gb-field" 
                            value="<?php echo $row['item_gb']?>" name="gb_field[]" readonly>
                          </td>
                          <td>
                            <?php if($row['order_return'] != 1): ?>
                              <?php 
                              echo (++$na === 1)? '': 
                              '<button class="del_row btn btn-danger"><i class="fa fa-close"></i></button>';  
                              ?>                            
                            <?php else:?>
                            <p class="text-danger">Returned</p>
                            <?php endif;?>
                            
                            <!-- re-update order return tbl_orders-->
                            <input type="number" name="order_return[]" 
                            class="hidden" value="<?php echo $row['order_return']; ?>" readonly>
                            <!-- re-update status in item_imei -->
                            <input type="number" name="status[]" 
                            class="hidden" value="<?php echo $row['status']; ?>" readonly> 

                          </td>
                        </tr>
                        <?php endwhile;?>
                        <tr class="add-new-row">
                          <td colspan="8">
                            <button class="pull-right btn btn-warning add_row btn-block"><i class="fa fa-plus"></i> New Item</button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <hr>
                    <p class="pull-left">
                          <b>Total items: </b> <span class="total_items"><?php echo $na; ?></span>
                    </p>
                    <button class="btn btn-primary btn-lg booking-completed pull-right">Booking Completed</button>
                    <input type="submit" name="submit_btn" class="pull-right btn btn-lg btn-success submit-form">
                  </div>
                  <!-- /.box-body -->
                </div>
                <!-- /.box -->
                </form>
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
  </div>

    <!-- sales items modal -->
    <input type="text" class="hide form-control sales_order_id" value="<?php echo $sales_id['sales_order_id']; ?>">
    <div class="modal fade" id="download-modal">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span></button>
          <h4 class="modal-title">Sales Items</h4>

          <!-- For calculation purpose  -->
          <ol class="sales-order-items hidden" style="max-height:500px; overflow-y:scroll;">
            <?php 
              $fetch_sales_orders = mysqli_query($conn,"select * from tbl_imei_sales_orders where 
              order_id=".$sales_id['sales_order_id']);
              while($sales = mysqli_fetch_assoc($fetch_sales_orders)): 

              ?>
                <li style="padding:4px;">
                <?php echo " <span class='sales_brand'>".$sales['item_brand']."</span> "
                    ." <span class='sales_details'>".$sales['item_details']."</span> "
                    ." <span class='sales_color'>".$sales['item_color']."</span> "
                    ." <span class='sales_gb'>".$sales['item_gb']."</span> "
                    ." <span class='sales_grade'>".$sales['item_grade']."</span> "
                    ." [<span class='sales_tray'>".$sales['tray_id']."</span>] ";
                    ?>                
                </li>
              <?php endwhile;?>
          </ol>
          <!-- For calculation purpose  -->


          <!-- sales order items -->
          <ol style="max-height:500px; overflow-y:scroll;padding:0;">
            <?php 
              $f_sales_orders = mysqli_query($conn,"select count(*) as total , item_brand, item_gb, item_details, item_color, item_grade, tray_id from tbl_imei_sales_orders where 
              order_id=".$sales_id['sales_order_id']." GROUP by item_brand, item_gb, item_details, item_color, item_grade");
              while($sales = mysqli_fetch_assoc($f_sales_orders)): 

                // fetch categories 
                $fetch_brand = mysqli_query($conn,"select title from tbl_categories where 
                category_id='".$sales['item_brand']."'");
                $brand =mysqli_fetch_assoc($fetch_brand)['title'];  

                // fetch grade 
                $fetch_grade = mysqli_query($conn,"select title from tbl_grades where 
                grade_id=".$sales['item_grade']);
                $grade =mysqli_fetch_assoc($fetch_grade)['title'];  
              ?>
                <li style="padding:6px; border-bottom:1px solid #eaeaea;">
                <?php echo " <span>".$brand."</span> "
                    ." <span>".$sales['item_details']."</span> "
                    ." <span>".$sales['item_color']."</span> "
                    ." <span>".$sales['item_gb']."GB </span> "
                    ." <span'>Grade ".$grade." </span> "
                    ." [<span>".$sales['tray_id']."</span>] "
                    ." <span class='text-success pull-right text-bold'>".$sales['total']."</span> ";
                    ?>                
                </li>
              <?php endwhile;?>
          </ol>


        </div>
      </div>
      <!-- /.modal-content -->
    </div>
    <!-- /.modal-dialog -->
  </div>
  <!-- /sales items modal -->


  <?php include $global_url."footer.php";?>
  <script src="edit_order_script.js"></script>
</body>
</html>
