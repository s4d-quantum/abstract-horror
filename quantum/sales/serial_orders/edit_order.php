<?php include '../../db_config.php';  ?>
<?php $global_url="../../"; ?>
<?php include "../../authenticate.php" ?>
<?php 

  $order_id = $_GET['ord_id'];

  // fetch brands/categories
  $fetch_categories = mysqli_query($conn,"select * from tbl_categories");
 
  // fetch suppliers
  $fetch_suppliers = mysqli_query($conn,"select * from tbl_suppliers order by name");

  // fetch customers
  $fetch_customers = mysqli_query($conn,"select * from tbl_customers order by name");

  $fetch_basic_data = mysqli_query($conn,"select customer_id, po_ref, user_id from 
  tbl_serial_sales_orders where 
  order_id=".$order_id)
    or die('Error:: ' . mysqli_error($conn));
  $fetch_data = mysqli_fetch_assoc($fetch_basic_data);

  $fetch_edit_data = mysqli_query($conn,"
  SELECT 
  customer_id,
  item_details,
  item_brand,
  item_grade,
  tray_id,
  COUNT(item_details) as total 
  
  FROM tbl_serial_sales_orders 
  WHERE order_id=".$order_id." 

  GROUP BY 
  item_details, 
  item_brand, 
  tray_id,
  item_grade
  
  ");

  // Group by 
  // item_details, 
  // item_color, 
  // item_gb, 
  // item_grade, 
  // item_brand, tray_id
  

?>
<?php include "../../header.php";?>

  <!-- Content Wrapper. Contains page content -->
  <div class="content-wrapper no-print">
    <!-- Content Header (Page header) -->
    <section class="content-header">
      <h1>
        Edit Sales Order# <?php echo $order_id; ?>
      </h1>
    </section>

    <!-- Main content -->
    <section class="content">
      <div class="row">

      <input type="text" class="order_id hidden" value="<?php echo $order_id; ?>" />

        <!-- form started -->
        <form enctype="multipart/form-data" action="" method="post">

        <!-- Main content -->
        <div class="col-xs-12">
          <section class="content">
            <div class="row">
              <div class="col-xs-12">

                <div class="box">
                  <div class="box-header">
                    <div class="row">
                      <input type="text" name="purchase_id" class="form-control purchase_id hide" 
                        value="<?php echo $new_ord_id;?>">

                      <div class="form-group col col-md-4">
                        <label>Supplier</label>
                          <select required class="form-control select2 purchase_supplier" name="purchase_supplier">
                          <option value="">Select Supplier</option>
                          <?php while($row = mysqli_fetch_assoc($fetch_suppliers)):?>
                          <option value="<?php echo $row['supplier_id']; ?>">
                          <?php echo $row['name']; ?> </option>
                        <?php endwhile; ?>
                        </select>
                      </div>

                      <div class="form-group col col-md-4">
                        <label>Category</label>
                          <select required class="form-control select2 purchase_category" name="model">
                        </select>
                        <span class="text-danger text-sm">Total: <span class="total-cat-count">0</span></span>
                      </div>

                      <div class="form-group col col-md-2 loading-spinner">
                        <br>
                        <i style="margin-top:15px" class="fa fa-spinner fa-spin"></i>&nbsp;Loading Filters..
                      </div>

                    </div>
                    <h3 class="box-title">Filtered Result</h3>
                  </div>
                  <!-- /.box-header -->
                  <div class="box-body" style="max-height:400px; overflow-y:scroll;">

                    <table id="filtered_table" class="table table-bordered">
                      <thead>
                        <tr>
                          <th>Brand</th>
                          <th>Model/Details</th>
                          <th>Grade</th>
                          <th>Tray</th>
                          <th>Qty</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody></tbody>
                    </table>
                  </div>
                  <!-- /.box-body -->
                </div>
                <!-- /.box -->

                <!-- user id  -->
                <input type="text" class="hidden user_id" value="<?php echo $_SESSION['user_id']; ?>">

                <div class="box">
                  <div class="box-header">
                    <div class="row">
                      <div class="form-group col col-md-4">
                        <label>Select Customer</label>
                          <select required class="form-control select2 purchase_customer" name="purchase_customer">
                          <option value="">Select Customer</option>
                          <?php while($row = mysqli_fetch_assoc($fetch_customers)):?>
                            <option value="<?php echo $row['customer_id']; ?>" 
                            <?php echo ($fetch_data['customer_id'] == $row['customer_id'])?
                            'selected':''; ?>>
                            <?php echo $row['name']; ?></option>
                        <?php endwhile; ?>
                        </select>
                      </div>

                      <div class="form-group col col-md-3">
                        <label>PO Reference</label>
                          <input type="text" value="<?php echo $fetch_data['po_ref'];?>" 
                          class="form-control po_ref" name="po_ref" />
                      </div>


                    </div>
                    <h3 class="box-title">Selected Items</h3>                      
                  </div>
                  <!-- /.box-header -->
                  <div class="box-body">
                    <table id="selected_table" class="table table-bordered">
                      <thead>
                        <tr>
                          <th>Supplier</th>
                          <th>Brand</th>
                          <th>Model/Details</th>
                          <th>Grade</th>
                          <th>Tray#</th>
                          <th>Qty</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colspan="9">
                          <div class="total-selected"><b>Total:</b> <span></span></div>
                            <button class="btn-lg btn btn-success pull-right submit-btn" name="submit">Submit</button>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  <!-- /.box-body -->
                </div>
                <!-- /.box -->


              </div>
            </div>
          </section>
        </div> <!-- col -->

        </form>
        <!-- /.form -->

      </div>
      <!-- /.row -->
    </section>
    <!-- /.content -->
  </div>
  <!-- /.content-wrapper -->


<!-- Grades for new row copy-->	
<select class="form-control grade-field-copy hide" >	
    <?php 	
    // fetch grades	
    $fetch_grades_query2= mysqli_query($conn,"select * from tbl_grades");	
    while($get_grade2 = mysqli_fetch_assoc($fetch_grades_query2)): 	
    	
    ?>	
      <option value="<?php echo $get_grade2['grade_id'];?>"	
      ><?php echo $get_grade2['title']; ?></option>	
    <?php endwhile;?>	
  </select>

  <select required class="fetch_categories hide">
    <?php while($item = mysqli_fetch_assoc($fetch_categories)):?>
      <option value="<?php echo $item['category_id'];?>">
        <?php echo $item['title']; ?></option>
    <?php endwhile; ?>
  </select>


<?php include $global_url."footer.php";?>
<script src="edit_sales_order_script.js"></script>
<script>
  window.console.log = () => {}
</script>

</body>
</html>