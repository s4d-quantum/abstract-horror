<?php $global_url="../../"; ?>
<?php include '../../db_config.php';  ?>
<?php include "../../authenticate.php" ?>
<?php 


// fetch suppliers
$fetch_suppliers = mysqli_query($conn,"select * from tbl_suppliers order by name");

// ***********
// Order export excel

// get product details

if(isset($_GET['qc_id'])){

  $order_id = $_GET['qc_id'];
  $get_products_query2 = mysqli_query($conn,"select 
  im.item_code,
  qc.item_comments,
  qc.item_cosmetic_passed,
  qc.item_functional_passed,
  qc.item_flashed
  from tbl_qc_serial_products as qc inner join 
  tbl_serial_products as im on im.item_code = qc.item_code
  where qc.purchase_id = ".$order_id)
  or die('error: '.mysqli_error($conn));
  
  // Store items in array
  $item_array= array();
  while($export_query = mysqli_fetch_assoc($get_products_query2)){

    $model_query = mysqli_query($conn,"
    select 
    item_details,
    item_grade
    
    from tbl_serial_products

    where 
    item_code = '".$export_query['item_code']."'")
    or die('Error:: ' . mysqli_error($conn));
    $model = mysqli_fetch_assoc($model_query);

    
    // get item grade
    if($model['item_grade'] > 0){
      $grade_query = mysqli_query($conn,"
      select 
      title 
      from 
      tbl_grades

      where 
      grade_id = ".$model['item_grade'])
      or die('Error:: ' . mysqli_error($conn));
      $grade = mysqli_fetch_assoc($grade_query);

    }

    $item_array[] = array(
      'Item' => '="'.$export_query['item_code'].'"',
      'Model/Details'=>$model['item_details'],
      'Grade' => $model['item_grade'] > 0 ? $grade['title'] : '-',
      'Cosmetic'=> $export_query['item_cosmetic_passed']== 1?'Passed':'Failed',
      'Functional'=> $export_query['item_functional_passed']== 1?'Passed':'Failed',
      'Fault'=> $export_query['item_flashed']== 1?'Yes':'No',
      'Comments'=> $export_query['item_comments']
    );
  }

  
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
    $filename = 'QC_'.$order_id.'.xls';	
    header("Content-Type: application/vnd.ms-excel");
    header("Content-Disposition: attachment; filename=\"$filename\"");
    ExportFile($item_array);
    exit();

}//if ended

// Order export excel ended
// ***********



?>
<?php include "../../header.php" ?>

  <!-- Content Wrapper. Contains page content -->
  <div class="content-wrapper">
    <!-- Content Header (Page header) -->
    <section class="content-header">
      <h1>
        Manage QC
      </h1>
    </section>

      <!-- Main content -->
      <div class="col-xs-12">
          <section class="content">
            <div class="row">
              <div class="col-xs-12">
                <div class="box">
                  <!-- /.box-header -->
                  <div class="box-body">

                    <!-- datatable begins-->
                      <div class="custom_datatable">
                        <div class="table-wrapper">
                          <div class="table-filter">
                            <div class="row">
                              <div class="col-sm-3">
                                <input type="text" class="form-control search-datatable" placeholder="Search ID">
                              </div>

                              <div class="col-sm-3">
                                <select required class="form-control select2 search_supplier">
                                  <option value="">Select Supplier</option>
                                  <?php while($row = mysqli_fetch_assoc($fetch_suppliers)):?>
                                  <option value="<?php echo $row['supplier_id']; ?>">
                                  <?php echo $row['name']; ?> </option>
                                <?php endwhile; ?>
                                </select>
                              </div>

                              <div class="col-sm-3">
                                <select required class="form-control select2 search_status">
                                  <option value="">Status</option>
                                  <option value="1">Completed</option>
                                  <option value="0">Incomplete</option>
                                </select>
                              </div>

                            </div>
                        </div>


                        <table class="table table-striped table-hover">
                          <thead>
                            <tr>
                            <th>P.Date</th>
                              <th>Purchase ID</th>
                              <th>Tray#</th>
                              <th>Supplier</th>
                              <th>Status</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                            <tbody>
                            </tbody>
                        </table>
                        <div class="data-loading">
                    <div class="spinner">
                      <div class="bounce1"></div>
                      <div class="bounce2"></div>
                      <div class="bounce3"></div>
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
                    <div class="brand-list hide">
                      <?php $get_category = mysqli_query($conn,"select title, category_id from tbl_categories")
                      or die('Error: '.mysqli_error($conn)); 
                      while($brands = mysqli_fetch_assoc($get_category)){
                        echo '<span>'.$brands['title']."-".$brands['category_id']."</span>";
                      }
                      ?>
                    </div>
                    <!-- /datatable ended-->

                  <!-- /.box-body -->
                </div>
                <!-- /.box -->
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



<?php include $global_url."footer.php";?>
<script src="../../assets/js/xlsx.full.min.js"></script>
<script src="manage_qc_history_datatable_script.js"></script>
</body>
</html>