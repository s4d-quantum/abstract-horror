<?php include '../../db_config.php';  ?>
<?php $global_url="../../"; ?>
<?php include "../../authenticate.php" ?>
<?php include "../../csrf_protection.php" ?>
<?php 

  // fetch suppliers
  $fetch_customers = mysqli_query($conn,"select * from tbl_customers order by name");

  // fetch po_ref, customer_ref, and customer_id
  // Keep the sales-order context on POST as well, so goods-out completion cannot
  // silently skip the tbl_imei_sales_orders update when the query string is lost.
  $sales_order_id = 0;
  if (isset($_POST['sales_order_id'])) {
    $sales_order_id = intval($_POST['sales_order_id']);
  } elseif (isset($_GET['sales_order'])) {
    $sales_order_id = intval($_GET['sales_order']);
  }

  $po_ref = '';
  $customer_ref = '';
  $sales_customer_id = '';
  if ($sales_order_id > 0) {
    $fetch_sales_data = mysqli_query($conn,"select po_ref, customer_ref, customer_id from tbl_imei_sales_orders
    where order_id=".$sales_order_id." LIMIT 1");
    $sales_data = $fetch_sales_data ? mysqli_fetch_assoc($fetch_sales_data) : null;

    if (!$sales_data) {
      die('Error: Sales order not found. Please reopen the goods out from the sales order list and try again.');
    }

    $po_ref = $sales_data['po_ref'];
    $customer_ref = $sales_data['customer_ref'];
    $sales_customer_id = $sales_data['customer_id'];
  }
  // print_r($po_ref);
  // die();

  // fetch brands/categories
  $fetch_categories = mysqli_query($conn,"select * from tbl_categories");

  $curr_date = date("Y-m-d");
  $showLoading = false;
	  // ON SUBMIT
	  if(isset($_POST['submit_btn'])){

    if ($sales_order_id <= 0) {
      die('Error: Missing sales order reference. Please reopen the goods out from the sales order list and try again.');
    }

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

	    $showLoading = true;

	    // DATE VALIDATION FIX: Validate date format and value
	    $date_input = str_replace("/", "-", $_POST['order_date']);

    // Validate date format and ensure it's a real date
    $date_parts = explode("-", $date_input);
    if (count($date_parts) != 3) {
      die('Error: Invalid date format. Expected format: YYYY-MM-DD or YYYY/MM/DD');
    }

    // Check if it's a valid date
    if (!checkdate($date_parts[1], $date_parts[2], $date_parts[0])) {
      die('Error: Invalid date. Please enter a valid date.');
    }

    // Check date is not in the future (allow today)
    $input_date = strtotime($date_input);
    $today = strtotime(date('Y-m-d'));
    if ($input_date > $today) {
      die('Error: Order date cannot be in the future.');
    }

    // Check date is not too old (e.g., more than 1 year ago)
    $one_year_ago = strtotime('-1 year');
    if ($input_date < $one_year_ago) {
      die('Error: Order date cannot be more than 1 year in the past.');
    }

    $date = $date_input;
    $customer_id = $_POST['order_customer'];
    $user_id = $_SESSION['user_id'];

    $_POST['total_boxes'] = strlen($_POST['total_boxes']) > 0 ? $_POST['total_boxes'] : 0;
    $_POST['po_box'] = strlen($_POST['po_box']) > 0 ? $_POST['po_box'] : 0;
    $_POST['customer_ref'] = strlen($_POST['customer_ref']) > 0 ? $_POST['customer_ref'] : 0;
    $_POST['tracking_no'] = strlen($_POST['tracking_no']) > 0 ? $_POST['tracking_no'] : 0;
    $_POST['total_pallets'] = strlen($_POST['total_pallets']) > 0 ? $_POST['total_pallets'] : 0;
    $_POST['delivery_company'] = strlen($_POST['delivery_company']) > 0 ? $_POST['delivery_company'] : 0;
    

	    // START TRANSACTION
	    mysqli_begin_transaction($conn);

	    // NEW goods-out order ID (uses tbl_orders.order_id, not tbl_orders.id)
	    // NOTE: MAX(order_id)+1 can collide under concurrency; we use a MySQL advisory lock (no schema change).
	    // If the lock cannot be acquired quickly, we fall back to prior behaviour (to avoid hard failures).
	    $lock_name = mysqli_real_escape_string($conn, 'idalloc:tbl_orders:order_id');
	    $lock_timeout = 3;
	    $got_lock = false;
	    $lock_rs = mysqli_query($conn, "SELECT GET_LOCK('".$lock_name."', ".$lock_timeout.") AS got_lock");
	    if ($lock_rs) {
	      $lock_row = mysqli_fetch_assoc($lock_rs);
	      $got_lock = isset($lock_row['got_lock']) && (string)$lock_row['got_lock'] === '1';
	    }

	    $new_order_id = 0;

	    try {
	        // Some deployments were briefly writing tbl_orders.id into tbl_orders.order_id.
	        // That pollutes MAX(order_id). We therefore try to derive the "legacy" max(order_id)
	        // from rows where (id - order_id) is large (normal), ignoring the corrupted range.
	        $ord_rs = mysqli_query($conn, "
	            SELECT COALESCE(MAX(order_id), 2883) AS oid
	            FROM tbl_orders
	            WHERE (id - order_id) > (
	                SELECT FLOOR(COALESCE(MAX(id - order_id), 0) / 2)
	                FROM tbl_orders
	            )
	        ");
	        if (!$ord_rs) {
	            // Fallback to previous behaviour if the heuristic query fails
	            $ord_rs = mysqli_query($conn, "SELECT COALESCE(MAX(order_id), 2883) AS oid FROM tbl_orders");
	        }
	        if (!$ord_rs) {
	            throw new Exception('DB error generating goods-out order ID: ' . mysqli_error($conn));
	        }

	        $ord_row = mysqli_fetch_assoc($ord_rs);
	        $new_order_id = ((int)($ord_row['oid'] ?? 2883)) + 1;

	        // Ensure the generated order_id is unused (no UNIQUE constraint in schema)
	        while ($new_order_id > 0) {
	            $exists_rs = mysqli_query($conn, "SELECT 1 FROM tbl_orders WHERE order_id = ".$new_order_id." LIMIT 1");
	            if (!$exists_rs) {
	                throw new Exception('DB error validating goods-out order ID: ' . mysqli_error($conn));
	            }
	            if (mysqli_num_rows($exists_rs) === 0) {
	                break;
	            }
	            $new_order_id++;
	        }

	        if ($new_order_id <= 0) {
	            throw new Exception('Failed to generate a valid goods-out order ID.');
	        }

	        // INSERT TO order INVENTORY TBL
	        for($i = 0;$i<count($_POST['imei_field']);$i++){
	          $imei = $_POST['imei_field'][$i];

          // Add into TAC table
          $new_order_input = mysqli_query($conn,"insert into tbl_orders (
          item_imei,
          date,
          customer_id,
          order_id,
          po_box,
          delivery_company,
          total_boxes,
          total_pallets,
          customer_ref,
          tracking_no,
          user_id,
          order_return,
          unit_confirmed,
          has_return_tag) 
          values(
          '".$imei."',
          '".$date."',
          '".$customer_id."',
          '".$new_order_id."',
          '".$_POST['po_box']."',
          '".$_POST['delivery_company']."',
          ".$_POST['total_boxes'].",
          ".$_POST['total_pallets'].",
          '".$_POST['customer_ref']."',
          '".$_POST['tracking_no']."',
          ".$user_id.",
          0,
          0,
          0
          )");

          if (!$new_order_input) {
             throw new Exception('Error inserting order for IMEI: ' . $imei . ' - ' . mysqli_error($conn));
          }
            
          $in_sales_order_value = $sales_order_id > 0 ? $sales_order_id : 'NULL';
          
          // SAFETY CHECK: Only update if status is 1 (In Stock)
          $new_imei = mysqli_query($conn,"update tbl_imei set status=0, in_sales_order = ".$in_sales_order_value." 
          where item_imei ='".$imei."' AND status = 1");

          if (!$new_imei) {
             throw new Exception('DB Error updating IMEI: ' . $imei . ' - ' . mysqli_error($conn));
          }

          if (mysqli_affected_rows($conn) == 0) {
             // Rollback immediately if we tried to ship something not in stock
             throw new Exception("Stock Integrity Error: IMEI $imei is not in stock (or already shipped). Transaction aborted.");
          }

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
            'NEW IMEI ORDER',
            'QTY:1',
            '".$date."',
            ".$user_id.",
            '".$imei."'
            )");
            
          if (!$new_log) {
             throw new Exception('Error logging IMEI: ' . $imei . ' - ' . mysqli_error($conn));
          }

        }//for loop ended

        // Set item status to completed in tbl_imei_sales_orders
        if ($sales_order_id > 0) {
           // Lock the sales order for update to prevent race conditions
            $check_completed = mysqli_query($conn,"SELECT is_completed, goodsout_order_id FROM tbl_imei_sales_orders
            WHERE order_id = ".$sales_order_id." LIMIT 1 FOR UPDATE");
            
            $existing_status = mysqli_fetch_assoc($check_completed);

            if ($existing_status && $existing_status['is_completed'] == 1) {
                // If already completed, we just rollback our current transaction.
                // We do NOT modify any existing data. "Ghost stock" prevention.
                throw new Exception("Order #$sales_order_id was already completed by another user.");
            }

            // Mark as completed
            $update_sales_order = mysqli_query($conn,"UPDATE tbl_imei_sales_orders
            SET
            is_completed = 1,
            goodsout_order_id =".$new_order_id."
            WHERE order_id = ".$sales_order_id." AND is_completed = 0");
            
            if (!$update_sales_order || mysqli_affected_rows($conn) == 0) {
                 throw new Exception("Failed to mark Sales Order #$sales_order_id as completed. Possible race condition.");
            }
        }

	        // If we got here, everything is good
	        mysqli_commit($conn);
	        
	    } catch (Exception $e) {
	        mysqli_rollback($conn);
	        die('Transaction Failed: ' . $e->getMessage());
	    } finally {
	      if ($got_lock) {
	        mysqli_query($conn, "SELECT RELEASE_LOCK('".$lock_name."')");
	      }
	    }

    // Set item status to completed in tbl_imei_sales_orders
    // CRITICAL FIX: Check if already completed to prevent race condition and duplicate goods out
    // Race condition logic removed because we now use Transactions and FOR UPDATE locking.
    // If the transaction fails, we simply die() with the error, and the user can retry or check the status.
    // No more "reverting" updates manually.

    // header("location:order_details.php?sales_order=".$new_order_id."&email=1");
    header("location:order_details.php?ord_id=".$new_order_id."&email=1&autoprint=1");

  }
?>
<?php include "../../header.php";?>

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

    <div class="btn-group pull-right" style="margin-right:5px">
      <!-- Save and retrieve scanned items  -->
      <button class="btn btn-info save_btn"><i class="fa fa-download"></i>
        Save Items</button>
      <!-- /fetch scanned items  -->
      <button class="btn auto_scan btn-primary"><i class="fa fa-upload"></i>
        Reload Items</button>
    </div>

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
                <input type="hidden" name="sales_order_id" value="<?php echo $sales_order_id; ?>">
                <div class="box">
                  <div class="box-header">
                    <h3 class="box-title">Details</h3>
                  </div>
                  <!-- /.box-header -->
                  <div class="box-body">
                    <div class="row">

                      <!-- pick Date  -->
                      <label for="" class="col col-md-4 col-sm-4">
                        Date
                        <input type="text" name="order_date" class="form-control order_date"
                          value="<?php echo $curr_date; ?>" id="order_date" required>
                      </label>

                      <!-- select customer  -->
                      <div class="form-group col col-md-4 col-sm-4">
                        <label>Select Customer</label>
                        <select required class="form-control order_customer" name="order_customer" readonly>
                          <option value="">Select Customer</option>
                          <?php while($row = mysqli_fetch_assoc($fetch_customers)):?>
                          <option value="<?php echo $row['customer_id']; ?>"
                            <?php echo $sales_customer_id === $row['customer_id'] ? 'selected' : ''?>>
                            <?php echo $row['name']; ?> </option>
                          <?php endwhile; ?>
                        </select>
                      </div>

                      <!-- Customer Ref# -->
                      <div class="customsales_data col-md-4 col-sm-4">
                        <label sales_data="">Customer Ref</label>
                        <input type="text" name="customer_ref" class="form-control"
                          value="<?php echo $customer_ref; ?>">
                      </div>

                    </div>

                    <div class="row">

                      <div class="po-box col-md-2 col-sm-3">
                        <label for="">Total # of Boxes</label>
                        <input type="number" name="total_boxes" class="total_boxes form-control">
                      </div>

                      <div class="po-box col-md-2 col-sm-3">
                        <label for="">Total # of Pallets</label>
                        <input type="number" name="total_pallets" class="total_pallets form-control">
                      </div>

                      <!-- PO Box -->
                      <div class="po-box col-md-2 col-sm-3">
                        <label for="">PO Reference</label>
                        <input type="text" name="po_box" value="<?php echo $po_ref; ?>" class="form-control">
                      </div>

                      <!-- Delivery Company -->
                      <div class="deliver-company col-md-3 col-sm-4">
                        <label for="">Delivery Company</label>
                        <select name="delivery_company" class="form-control" id="delivery_company">
                          <option value="">Select</option>
                          <option value="DPD">DPD</option>
                          <option value="DHL">DHL</option>
                          <option value="UPS">UPS</option>
                          <option value="FedEx">FedEx</option>
                          <option value="Royal Mail">Royal Mail</option>
                        </select>
                      </div>

                      <!-- tracking no# -->
                      <div class="customsales_data col-md-3 col-sm-4">
                        <label sales_data="">Tracking No </label>
                        <input type="text" name="tracking_no" class="form-control" value="">
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
                        <tr>
                          <td>
                            <div class="form-group">
                              <input type="text" class="form-control imei-field" name="imei_field[]" required>
                              <span class="help-block"></span>
                            </div>
                          </td>
                          <td>
                            <input type="text" class="form-control details-field" name="details_field[]" readonly>
                            <input type="text" class="hide form-control order_id" name="order_id[]">
                          </td>
                          <td>
                            <input type="text" class="form-control brand-field" name="brand_field[]" readonly>
                          </td>
                          <td>
                            <input type="text" class="form-control grade-field" name="grade_field[]" readonly>
                          </td>
                          <td>
                            <input type="text" class="form-control color-field" name="color_field[]" readonly>
                          </td>
                          <td>
                            <input type="text" class="form-control gb-field" name="gb_field[]" readonly>
                          </td>
                          <td></td>
                        </tr>
                        <tr class="add-new-row">
                          <td colspan="7">
                            <!-- <button class="pull-right btn btn-warning add_row btn-block"><i class="fa fa-plus"></i> 
                            New Item</button> -->
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <p class="pull-left">
                      <b>Total items: </b> <span class="total_items">1</span>
                    </p>
                    <div class="button-container pull-right">
                      <button class="btn btn-primary btn-lg booking-completed">Booking Completed</button>
                      <?php if ($sales_customer_id === 'CST-78'): ?>
                      <button class="btn btn-warning btn-lg book-dpd-bm" style="margin-right: 10px;" data-backmarket="true">Book Shipment</button>
                      <?php endif; ?>
                      <input type="submit" name="submit_btn" class="btn btn-lg btn-success submit-form">
                    </div>
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
<audio id="duplicate-beep no-print">
  <source src="../../duplicate-beep.mp3" type="audio/mp3">
  Your browser does not support the audio element.
</audio>
<!-- /duplicate beep -->

<!-- outofstock beep -->
<audio id="outofstock-beep no-print">
  <source src="../../outofstock-beep.mp3" type="audio/mp3">
  Your browser does not support the audio element.
</audio>
<!-- /outofstock beep -->

<!-- Add these to your new_order.php file if they're not already present -->
<audio id="duplicate-beep">
  <source src="../../error-beep.mp3" type="audio/mp3">
  Your browser does not support the audio element.
</audio>

<audio id="outofstock-beep">
  <source src="../../error-beep.mp3" type="audio/mp3">
  Your browser does not support the audio element.
</audio>

<div class="page-loader no-print">
  <i class="fa fa-spinner fa-spin"></i>
</div>

<!-- grades -->
<select class="form-control no-print grade-field hide">
  <?php 
      $fetch_grades = mysqli_query($conn,"select * from tbl_grades");
      while($item = mysqli_fetch_assoc($fetch_grades)):?>
  <option value="<?php echo $item['grade_id'];?>"><?php echo $item['title']; ?></option>
  <?php endwhile;?>
</select>

</div>



<!-- sales items modal -->
<div class="sales-modal-container">
    <input type="text" class="hide form-control sales_order_id" value="<?php echo $sales_order_id; ?>">
  <div class="modal fade sales-model" id="download-modal">
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
              $fetch_sales_orders = mysqli_query($conn,"select * from tbl_imei_sales_orders where 
              order_id=".$sales_order_id);
                while($sales = mysqli_fetch_assoc($fetch_sales_orders)): 

                ?>
            <li style="padding:4px;">
              <?php echo " <span class='sales_brand'>".$sales['item_brand']."</span> "
                      ." <span class='sales_details'>".$sales['item_details']."</span> "
                      ." <span class='sales_color'>".$sales['item_color']."</span> "
                      ." <span class='sales_gb'>".$sales['item_gb']."</span> "
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


        </div>
      </div>
      <!-- /.modal-content -->
    </div>
    <!-- /.modal-dialog -->
  </div>
</div>
<!-- /sales items modal -->

<!-- Suppliers -->
<select class="hide form-control supplier-field">
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
<select class="hide form-control brand-field">
  <?php 	
    // fetch brands	
    $fetch_brands_query2= mysqli_query($conn,"select category_id, title from tbl_categories");	
    while($get_brand2 = mysqli_fetch_assoc($fetch_brands_query2)): 	
    	
    ?>
  <option value="<?php echo $get_brand2['category_id'];?>"><?php echo $get_brand2['title']; ?></option>
  <?php endwhile;?>
</select>
<!-- Categoies-->

<!-- Grades-->
<select class="hide form-control grade-field">
  <?php 	
    // fetch grades	
    $fetch_grades_query2= mysqli_query($conn,"select grade_id, title from tbl_grades");	
    while($get_grade2 = mysqli_fetch_assoc($fetch_grades_query2)): 	
    	
    ?>
  <option value="<?php echo $get_grade2['grade_id'];?>"><?php echo $get_grade2['title']; ?></option>
  <?php endwhile;?>
</select>
<!-- Grades-->


<?php include $global_url."footer.php";?>
<script src="new_order_script.js"></script>
<script>
$('.print_sales_items').on('click', function() {
  window.print();
})

// Add CSS for consistent button positioning
$('<style>').text(`
  .button-container {
    display: flex;
    align-items: center;
    min-height: 50px; /* Match the button height to maintain consistent space */
    flex-wrap: nowrap;
  }
  .button-container .booking-completed {
    display: inline-block;
  }
 .button-container .book-dpd-bm {
    display: inline-block;
  }
 .button-container .submit-form {
    display: inline-block;
  }
`).appendTo('head');
</script>
</body>

</html>
