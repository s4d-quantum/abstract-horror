<?php include '../../db_config.php'; ?>
<?php include "../../authenticate.php"; ?>

<style>
  #inventorySearchModal .modal-dialog {
    max-width: 98%;
    margin: 1rem auto;
  }
  
  #inventorySearchModal .modal-content {
    width: 100%;
    height: 95vh;
  }
  
  #inventorySearchModal .modal-body {
    max-height: 82vh;
    overflow-y: auto;
    padding: 20px 25px;
  }
  
  #inventorySearchModal .table-wrapper {
    max-height: 600px;
    overflow-y: auto;
  }
  
  #inventorySearchModal table {
    min-width: 100%;
    table-layout: auto;
  }
  
  #inventorySearchModal th,
  #inventorySearchModal td {
    white-space: nowrap;
  }
  
  #inventorySearchModal .prev-next-btn.disabled {
    opacity: 0.5;
    pointer-events: none;
  }
  
  #inventorySearchModal .prev-next-btn a {
    text-decoration: none;
    color: #337ab7;
  }
  
  #inventorySearchModal .prev-next-btn.disabled a {
    color: #999;
  }
</style>

<div class="modal fade" id="inventorySearchModal" tabindex="-1" role="dialog" aria-labelledby="inventorySearchModalLabel" aria-hidden="true">
  <div class="modal-dialog modal-xl" role="document">
    <div class="modal-content">
      <div class="modal-header">
        <h4 class="modal-title">Inventory Search</h4>
        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <div class="modal-body">
        <div class="row">
          <div class="col-md-12">
            <label for="" style="width:16%;">
              <select class="form-control select-category">
                <option value="">Manufacturer</option>
                <?php
                $fetch_categories = mysqli_query($conn, "select title, category_id from tbl_categories")
                or die('Error: '.mysqli_error($conn));
                while($row = mysqli_fetch_assoc($fetch_categories)):
                ?>
                <option value="<?php echo $row['category_id'];?>"><?php echo $row['title'];?></option>
                <?php endwhile; ?>
              </select>
            </label>

            <?php
            $fetch_colors = mysqli_query($conn, "select distinct item_color from tbl_imei ORDER BY item_color ASC")
            or die('Error: '.mysqli_error($conn));
            $colorOptions = [];
            while($color = mysqli_fetch_assoc($fetch_colors)){
              if(strlen($color['item_color']) > 0){
                $colorOptions[] = $color['item_color'];
              }
            }
            ?>
            <label for="" style="width:16%; position:relative;">
              <input type="text" placeholder="Color" class="form-control select-color" autocomplete="off"
                data-color-options='<?php echo htmlspecialchars(json_encode($colorOptions), ENT_QUOTES, "UTF-8"); ?>'>
              <div class="color-suggestion-panel hide"></div>
            </label>

            <label for="" style="width:16%;">
              <select placeholder="GB" class="form-control select-gb">
                <option value="">Storage</option>
                <?php
                $fetch_gb_values = mysqli_query($conn, "select id, gb_value from tbl_gb order by gb_value+0")
                or die('Error: '.mysqli_error($conn));
                while($gb = mysqli_fetch_assoc($fetch_gb_values)):
                  $display_value = $gb['gb_value'];
                  if($gb['gb_value'] == 1024) {
                    $display_value = '1TB';
                  } else if($gb['gb_value'] == 2048) {
                    $display_value = '2TB';
                  } else {
                    $display_value .= ' GB';
                  }
                ?>
                <option value="<?php echo $gb['gb_value'];?>"><?php echo $display_value;?></option>
                <?php endwhile; ?>
              </select>
            </label>

            <label for="" style="width:16%;">
              <select class="form-control select-grade">
                <option value="">Grade</option>
                <option value="0">NULL</option>
                <option value="1">A</option>
                <option value="2">B</option>
                <option value="3">C</option>
                <option value="4">D</option>
                <option value="5">E</option>
                <option value="6">F</option>
              </select>
            </label>

            <label for="" style="width:16%;">
              <select class="form-control select-supplier">
                <option value="">Supplier</option>
                <?php
                $fetch_suppliers = mysqli_query($conn, "select name, supplier_id from tbl_suppliers order by name")
                or die('Error: '.mysqli_error($conn));
                while($row = mysqli_fetch_assoc($fetch_suppliers)):
                ?>
                <option value="<?php echo $row['supplier_id'];?>"><?php echo $row['name'];?></option>
                <?php endwhile; ?>
              </select>
            </label>

            <div style="width:100%;margin-top:10px;" class="filter-group">
              <input type="text" class="pull-left form-control search-model-input" placeholder="Search Model" style="width:80%;">
              <button style="width:19%; margin-left:1%;" class="pull-right btn btn-success btn-lg search-model">Search</button>
            </div>
          </div>
        </div>

        <div class="row" style="margin-top:10px;">
          <div class="col-md-12">
            <button class="apply-filters btn-success" style="width:100%;">
              Apply filters
            </button>
          </div>
        </div>

        <div class="row" style="margin-top:10px;">
          <div class="col-md-12">
            <div class="table-wrapper">
              <h4 class="no-data-error"></h4>
              <table class="table table-striped table-hover searched-table">
                <thead>
                  <tr>
                    <th><input type="checkbox" id="select-all-checkbox"></th>
                    <th>IMEI</th>
                    <th>Model</th>
                    <th>Color</th>
                    <th>Storage</th>
                    <th>Grade</th>
                    <th>Supplier</th>
                    <th>Location</th>
                  </tr>
                </thead>
                <tbody>
                </tbody>
              </table>
              <div class="data-loading" style="display: none;">
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
        </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
        <button type="button" class="btn btn-primary" id="addSelectedToCheck">Add Selected to Check</button>
      </div>
    </div>
  </div>
</div>

<!-- Brands and Suppliers hidden fields -->
<select class="hide form-control brands-field">
  <?php
  // fetch brands
  $fetch_brands_query2= mysqli_query($conn,"select category_id, title from tbl_categories ");
  while($get_category2 = mysqli_fetch_assoc($fetch_brands_query2)):
  ?>
  <option value="<?php echo $get_category2['category_id'];?>"><?php echo $get_category2['title']; ?></option>
 <?php endwhile;?>
</select>

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

<div class="grade-list hide">
  <?php $get_grade = mysqli_query($conn,"select title, grade_id from tbl_grades")
  or die('Error: '.mysqli_error($conn));
  while($grades = mysqli_fetch_assoc($get_grade)){
    echo '<span>'.$grades['title']."%".$grades['grade_id']."</span>";
  }
  ?>
</div>