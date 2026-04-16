<?php include '../../db_config.php';  ?>
<?php $global_url="../../"; ?>
<?php include "../../authenticate.php" ?>
<?php 

  $new_ord_id = $_GET['ord_id'];
  $new_id = substr($new_ord_id,2);

  // fetch order details
  $fetch_order_query = mysqli_query($conn,"select * from tbl_serial_orders where 
  order_id='".$new_ord_id."'")
  or die('Error:: ' . mysqli_error($conn));

  $fetch_order = mysqli_fetch_assoc($fetch_order_query);

  // fetch customers
  $fetch_customers = mysqli_query($conn,"select * from tbl_customers order by name");

  if(isset($_POST['submit_btn'])){

    $date = $fetch_order['date'];
    $customer_id = $_POST['order_customer'];
    $user_id = $_SESSION['user_id'];

    
    // ===========
    // update prev data
    // ===========
    $fetch_order_items = mysqli_query($conn,"select * from 
    tbl_serial_orders where 
    order_id = '".$new_ord_id."'")
    or die('Error:: ' . mysqli_error($conn));

    $item_array= array();
    while($t = mysqli_fetch_assoc($fetch_order_items)){
      $item_array[] = array(
        'item_code' => $t['item_code']
      );
    
    }

    for($i = 0;$i<count($item_array);$i++){
      $update_prev_data = mysqli_query($conn,"update tbl_serial_products 
      set status = 1 where item_code = '".$item_array[$i]['item_code']."'")
      or die('Error:: ' . mysqli_error($conn));
    }

    // ===========
    // delete prev data
    // ===========
    // delete previous order entries
    $del_prev_entries = mysqli_query($conn,"delete from tbl_serial_orders 
    where order_id='".$new_ord_id."'")
    or die('Error:: ' . mysqli_error($conn));

  // ===========
  // INSERT NEW DATA
  // ===========
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
      order_return
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
        ".$_POST['order_return'][$i].")")
      or die('Error:: ' . mysqli_error($conn));

    // UPDATE PRODUCT
    $order_code = mysqli_query($conn,"update tbl_serial_products set
      status = ".$_POST['status'][$i]." 
      where item_code = '".$_POST['item_code'][$i]."'")
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
      'EDIT SERIAL ORDER',
      'QTY:1',
      '".$date."',
      ".$user_id.",
      '".$_POST['item_code'][$i]."'
      )")
      or die('Error:: ' . mysqli_error($conn));

  }

    header("location:serial_order_details.php?ord_id=".$new_ord_id."&email=1");

  }

?>
<?php include "../../header.php";?>

  <!-- Content Wrapper. Contains page content -->
  <div class="content-wrapper no-print">
    <!-- Content Header (Page header) -->
    <section class="content-header">
      <h1>
        Edit order #<?php echo $new_ord_id;?>
      </h1>
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
                <div class="box">
                  <div class="box-header">
                    <h3 class="box-title">Details</h3>
                  </div>
                  <!-- /.box-header -->
                  <div class="box-body">

                  <div class="row">
                    <input type="text" name="order_id" class="form-control order_id hide" 
                      value="<?php echo $new_ord_id;?>">

                    <label for="" class="col col-md-4 col-sm-6">
                      Date
                      <input type="text" name="order_date" class="form-control order_date" 
                      value="<?php echo $fetch_order['date'];?>" id="order_date">
                    </label>

                    <div class="form-group col col-md-4 col-sm-6">
                      <label>Select customer</label>
                      <select required class="form-control order_customer" name="order_customer">
                        <option value="">Select customer</option>
                          <?php while($row = mysqli_fetch_assoc($fetch_customers)):?>
                            <option value="<?php echo $row['customer_id']; ?>" 
                            <?php echo ($fetch_order['customer_id'] == $row['customer_id'])?
                            'selected':'' ?>>
                            <?php echo $row['name']; ?></option>
                          <?php endwhile; ?>
                      </select>
                    </div>

                  </div>

                  <div class="row">
                    <div class="po-box col-md-3 col-sm-4">
                      <label for="">Total # of Boxes</label>
                      <input type="number" name="total_boxes" class="total_boxes form-control" 
                      value="<?php echo $fetch_order['total_boxes']; ?>" required>
                    </div>

                    <div class="po-box col-md-3 col-sm-4">
                      <label for="">Total # of Pallets</label>
                      <input type="number" name="total_pallets" class="total_pallets form-control" 
                      value="<?php echo $fetch_order['total_pallets']; ?>" required>
                    </div>

                    <!-- PO Box -->
                    <div class="po-box col-md-3 col-sm-4">
                      <label for="">PO Reference</label>
                      <input type="text" name="po_box" class="form-control" 
                      value="<?php echo $fetch_order['po_box']; ?>">
                    </div>

                    <!-- Delivery Company -->
                    <div class="deliver-company col-md-3 col-sm-4">
                      <label for="">Delivery Company</label>
                      <input type="text" name="delivery_company" 
                      value="<?php echo $fetch_order['delivery_company']; ?>" 
                      class="form-control">
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
                    <table id="order_items" class="table table-bordered">
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
                        <?php
                          $na=1;
                          $fetch_products_query = mysqli_query($conn,"select 
                          distinct pr.item_code,
                          pr.item_details,
                          pr.item_brand,
                          pr.item_grade,
                          pr.status,
                          ord.order_return
                          from tbl_serial_products as pr 

                          inner join tbl_serial_orders as ord on 
                          pr.item_code = ord.item_code 
                          
                          where
                          ord.order_id = '".$new_ord_id."' order by 
                          ord.id");
                          while($row = mysqli_fetch_assoc($fetch_products_query)):
                        ?>
                        <tr>
                          <td class="row-id hide">
                            <?php echo $na; ?>
                          </td>
                          <td>
                            <div class="form-group">
                              <input type="text" class="form-control item_code" name="item_code[]" 
                              value="<?php echo $row['item_code'];?>"
                              required>
                              <span class="help-block item-code-help-block"></span>
                              <svg class="code727 code<?php echo $na;?>"></svg>
                            </div>
                          </td>
                          <td>
                            <?php 
                              // fetch brands/categories
                              $fetch_categories = mysqli_query($conn,"select * from tbl_categories 
                              where category_id='".$row['item_brand']."'");
                              $item = mysqli_fetch_assoc($fetch_categories);?>
                              <input type="text" name="item_brand[]"  placeholder="Item brand" 
                              class="form-control item_brand" value="<?php echo $item['title']; ?>">
                          </td>
                          <td>
                            <input type="text" class="form-control item_details" 
                            value="<?php echo $row['item_details'];?>"
                            name="item_details[]" >
                          </td>
                          <td>
                            <?php 
                              // fetch brands/grades
                              $fetch_grades = mysqli_query($conn,"select * from tbl_grades 
                              where grade_id='".$row['item_grade']."'");
                              $itemgrade = mysqli_fetch_assoc($fetch_grades);?>
                            <input type="text" class="form-control item_grade" 
                            value="<?php echo $itemgrade['title'];?>">
                          </td>
                          <td>
                            <?php if($row['order_return'] != 1): ?>
                              <?php 
                              echo $na === 1 ? '':
                              '<button class="del_row btn btn-danger"><i class="fa fa-close"></i></button>';                          
                            ?>
                            <?php else:?>
                              <p class="text-danger">Returned</p>
                            <?php endif;?>


                            <!-- re-update purchase return tbl_purchases-->
                            <input type="number" name="order_return[]" 
                            class="hidden" value="<?php echo $row['order_return']; ?>">
                            <!-- re-update status in item_imei -->
                            <input type="number" name="status[]" 
                            class="hidden" value="<?php echo $row['status']; ?>">

                          </td>
                        </tr>
                        <?php $na++; ?>
                        <?php endwhile;?>
                        <tr class="add_new_row">
                          <td colspan="8">
                            <button class="pull-right btn btn-warning add_row btn-block">
                            <i class="fa fa-plus"></i> 
                            New Item</button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <hr>
                    <p class="pull-left">
                      <b>Total items: </b> <span class="total_items"><?php echo $na-1; ?></span>
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


  <select class="hide tray_collection">
    <?php 
      while($tray = mysqli_fetch_assoc($fetch_trays)):
    ?>
      <option value="<?php echo $tray['tray_id'];?>">
        <?php echo $tray['tray_id'];?>        
      </option>
    <?php endwhile;?>
  </select>

  <div class="tag-container">
  </div>


<?php include $global_url."footer.php";?>
  <script src="edit_serial_order_script.js"></script>
</body>
</html>