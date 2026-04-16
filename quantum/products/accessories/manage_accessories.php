<?php $global_url="../../"; ?>
<?php include $global_url.'db_config.php';  ?>
<?php include $global_url."authenticate.php" ?>
<?php include $global_url."header.php" ?>
<?php 
/*/************/
/*Export to Excel Started*/
/*/************/
if(isset($_POST['export-to-excel'])){

  print_r($_POST);
  die();

  // Store items in array
  $item_array= array();
  for($i=0;$i < count($_POST['item_imei']); $i++){
    $item_array[] = array(
      'PID' => '="'.$_POST['pur_id'][$i].'"',
      'Brand'=> $_POST['item_brand'][$i],
      'Supplier'=> $_POST['item_supplier'][$i],
      'Color'=> $_POST['item_color'][$i]
      // 'GB'=> $_POST['item_gb'][$i],
      // 'Grage'=> $_POST['item_grade'][$i],
      // 'Details'=> $_POST['item_details'][$i],
      // 'Status'=> $_POST['item_status'][$i]      
    );
  }

  // print_r($item_array);
  // die();

function ExportFile($records) {
  $heading = false;
  if(!empty($records)){
    foreach($records as $row) {
      if(!$heading) {
        // display field/column names as a first row
        echo implode("\t", array_keys($row)) . "\n";
        $heading = true;
      }
      echo implode("\t", array_values($row)) . "\n";
    }
  }
  exit;
}

// $filename = $_POST["ExportType"] . ".xls";		 
  $filename = "Inventory.xls";		 
  header("Content-Type: application/vnd.ms-excel");
  header("Content-Disposition: attachment; filename=\"$filename\"");
  ExportFile($item_array);
  exit();

  header("location:manage_products.php");

}//if ended

/*/************/
/*/Export to Excel Ended*/
/*/************/

?>

    <!-- Content Wrapper. Contains page content -->
    <div class="content-wrapper">
      <!-- Content Header (Page header) -->
      <section class="content-header">
        <h1 class="pull-left">
          Manage Products
        </h1>
      </section>  
      <br>

      <!-- Main content -->
        <!-- Main content -->
        <div class="content">          
          <div class="row">
           <div class="col-md-12">

              <label for="" style="width:20%;">
                <select placeholder="Stock" class="form-control select-stock-type">
                  <option value="instock">InStock</option>
                  <option value="all">All</option>
                </select>
              </label>

              <label for=""  style="width:25%;">
                <select class="form-control select-category">
                  <option value="">Category</option>
                  <?php 
                    $fetch_categories = mysqli_query($conn, "select title, category_id  
                    from tbl_categories")
                    or die('Error: '.mysqli_error($conn)); 
                    while($row = mysqli_fetch_assoc($fetch_categories)):
                  ?>
                  <option value="<?php echo $row['category_id'];?>"><?php echo $row['title'];?></option>
                  <?php endwhile; ?>
                </select>
              </label>


              <label for="" style="width:25%;">
                <select class="form-control select-supplier">
                  <option value="">Supplier</option>
                  <?php 
                    $fetch_suppliers = mysqli_query($conn, "select name, supplier_id  
                    from tbl_suppliers order by name")
                    or die('Error: '.mysqli_error($conn)); 
                    while($row = mysqli_fetch_assoc($fetch_suppliers)):
                  ?>
                  <option value="<?php echo $row['supplier_id'];?>"><?php echo $row['name'];?></option>
                  <?php endwhile; ?>
                </select>
              </label>

              <label for="" style="width:25%;">
                <select name="" class="form-control select-customer">
                  <option value=""> Customer</option>
                  <?php 
                    $fetch_customers = mysqli_query($conn, "select name, customer_id  
                    from tbl_customers order by name")
                    or die('Error: '.mysqli_error($conn)); 
                    while($row = mysqli_fetch_assoc($fetch_customers)):
                  ?>
                  <option value="<?php echo $row['customer_id'];?>"><?php echo $row['name'];?></option>
                  <?php endwhile; ?>
                </select>
              </label>


              <label for=""style="width:20%;">
                <select class="form-control select-tray">
                  <option value="">Tray#</option>
                  <?php 
                    $fetch_trays = mysqli_query($conn, "select tray_id, title
                    from tbl_trays")
                    or die('Error: '.mysqli_error($conn)); 
                    while($tray = mysqli_fetch_assoc($fetch_trays)):
                    ?>
                    <option value="<?php echo $tray['tray_id'];?>"><?php echo $tray['title'];?></option>
                  <?php 
                endwhile; ?>
                </select>
              </label>

              <label for="" style="width:25%;">
                <input type="text" placeholder="From:" name="from_date" class="form-control from_date" 
                id="from_date" required>
              </label>


              <label for="" style="width:25%;">
                <input type="text" name="to_date" placeholder="To:" 
                class="form-control to_date" 
                id="to_date" required>
              </label>

              <button class="apply-filters btn btn-success" style="width:25%;">
                Apply filters
              </button>

              <div style="width:45%;margin-right:10px;" class="filter-group pull-left">
                <input type="text" class="pull-left form-control search-datatable-input" 
                  placeholder="Search Item code/details"
                  style="width:80%;padding:22px 20px !important; font-size:22px;" 
                  >
                  <button style="width:20%;" class="pull-right btn btn-success btn-lg search-datatable">Search</button>
              </div>
              

            </div>
          </div>
                      
          <section class="content">
            <div class="row">
              <div class="col-xs-12">
                <div class="box box-success">
                  <!-- /.box-header -->
                  <div class="box-body custom_datatable_wrapper">
                    
                    <!-- datatable begins-->
                    <div class="custom_datatable">
                      <b class="total_rows pull-left" style="font-size:18px;">Total: <span>loading..</span></b>

                      <!-- for export task-->
                      <!-- <form action="" method="post"> -->
                        <button type="submit" class="btn bg-purple pull-right no-print exportexcel">
                          <span class="download-export">
                            <i class="fa fa-download"></i> Download Export
                          </span>
                        </button>
                        <button type="button" style="margin-right:10px;" 
                        class="btn btn-default view-summary-btn pull-right" data-toggle="modal" data-target="#modal-default">
                          <i class="fa fa-search"></i> Summary
                        </button>

                        <table class="export-table table hide" id="export-table">
                          <thead>
                              <tr>
                                <th>P.ID</th>
                                <th>Item code/Details</th>
                                <th>Brand</th>
                                <th>Qty</th>
                              </tr>
                            </thead>
                            <tbody>
                            </tbody>
                          </table>

                        <div class="table-wrapper">
                        <h4 class="no-data-error"></h4>

                        <table class="table table-striped table-hover searched-table">
                          <thead>
                            <tr>
                              <th>Item Code/Details</th>
                              <th>Brand</th>
                              <th>Qty</th>

                            </tr>
                          </thead>
                            <tbody>
                            </tbody>
                        </table>
                        <div class="data-loading">
                        <div class="sk-folding-cube">
  <div class="sk-cube1 sk-cube"></div>
  <div class="sk-cube2 sk-cube"></div>
  <div class="sk-cube4 sk-cube"></div>
  <div class="sk-cube3 sk-cube"></div>
</div>
                    Processing
                  </div>
                        <div class="clearfix">
                          <div class="pagination-wrapper">
                            <div class="prev-next-btn" data-value="previous"><a href="#" class="page-link">Previous</a></div>
                            <div class="current-page-btn"><b>Page: <span class="current-page">1</span> of <span class="total-pages"></span></b></div>
                            <div class="prev-next-btn" data-value="next"><a href="#" class="page-link">Next</a></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <!-- brands  -->	
                    <select class="hide form-control brands-field" >	
                      <?php 	
                      // fetch brands 	
                      $fetch_brands_query2= mysqli_query($conn,"select category_id, title from tbl_categories ");	
                      while($get_category2 = mysqli_fetch_assoc($fetch_brands_query2)): 	
                        
                      ?>	
                        <option value="<?php echo $get_category2['category_id'];?>"	
                        ><?php echo $get_category2['title']; ?></option>	
                      <?php endwhile;?>	
                    </select>

                    <!-- Suppliers -->	
                    <select class="hide form-control supplier-field" >	
                      <?php 	
                      // fetch suppliers	
                      $fetch_suppliers_query2= mysqli_query($conn,"select supplier_id, name from tbl_suppliers");	
                      while($get_supplier2 = mysqli_fetch_assoc($fetch_suppliers_query2)): 	
                        
                      ?>	
                        <option value="<?php echo $get_supplier2['supplier_id'];?>"	
                        ><?php echo $get_supplier2['name']; ?></option>	
                      <?php endwhile;?>	
                    </select>

                  
                    <!-- /datatable ended-->

                  </div>
                  <!-- /.box-body -->
                </div>
                <!-- /.box -->
              </div>
            </div>
          </section>
        </div> <!-- col -->

        </div>
        <!-- /.row -->
      </div>
    <!-- /.content-wrapper -->

      <!-- modal -->
      <div class="modal fade" id="modal-default">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h4 class="modal-title">Instock Search Summary</h4>
              <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div class="modal-body">
              <table class="summary-table table table-bordered">
                <tbody>
                </tbody>
              </table>                      
            </div>
          </div>
          <!-- /.modal-content -->
        </div>
        <!-- /.modal-dialog -->
      </div>
      <!-- /.modal -->


<?php include $global_url."footer.php";?>
<script src="../../assets/js/xlsx.full.min.js"></script>
<script src="accessories-datatable-script.js"></script>
</body>
</html>