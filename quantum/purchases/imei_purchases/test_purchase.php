<?php include '../../db_config.php';  ?>
<?php $global_url="../../"; ?>
<?php include "../../authenticate.php" ?>
<?php 

  // NEW PURCHASE ID
  $new_pur_id_query = mysqli_query($conn,"Select max(ref_id) from tbl_log where 
  ref LIKE 'IPR-%'")
  or die('Error:: ' . mysqli_error($conn));
  $order_id_result = mysqli_fetch_assoc($new_pur_id_query);
  $new_pur_id = ($order_id_result['max(ref_id)']+1);

  $curr_date = date("Y-m-d");

  // fetch brands/categories
  $fetch_categories = mysqli_query($conn,"select * from tbl_categories");

  // fetch trays
  $fetch_trays = mysqli_query($conn,"select * from tbl_trays");

  // fetch suppliers
  $fetch_suppliers = mysqli_query($conn,"select * from tbl_suppliers");

?>
<?php include "../../header.php";?>

  <!-- Content Wrapper. Contains page content -->
  <div class="content-wrapper no-print">
    <!-- Content Header (Page header) -->
    <section class="content-header">
      <h1>
        New Purchase #<?php echo $new_pur_id;?>
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

              <form enctype="multipart/form-data" method="post" id="confirm_purchase" action="">
                
                <div class="box">
                  <div class="box-header">
                    <h3 class="box-title">Details</h3>
                  </div>
                  <!-- /.box-header -->
                  <div class="box-body">
                    <div class="row">

                      <!-- purchase id -->
                      <input type="text" name="purchase_id" class="form-control purchase_id hide" 
                        value="<?php echo $new_pur_id;?>">
                      <!-- user_id -->
                      <input type="text" name="user_id" class="form-control user_id hide" 
                        value="<?php echo $_SESSION['user_id'];?>">

                      <label for="" class="col col-md-4 col-sm-6">
                        Date
                        <input type="text" name="purchase_date" class="form-control purchase_date" 
                        value="<?php echo $curr_date; ?>" id="purchase_date">
                      </label>

                      <div class="form-group col col-md-4 col-sm-6">
                        <label>Select Supplier</label>
                        <select required class="form-control select2 purchase_supplier" name="purchase_supplier">
                          <option value="">Select Supplier</option>
                          <?php while($row = mysqli_fetch_assoc($fetch_suppliers)):?>
                          <option value="<?php echo $row['supplier_id']; ?>">
                          <?php echo $row['name']; ?> </option>
                        <?php endwhile; ?>
                        </select>
                      </div>

                      <!-- QC Required -->
                      <div class="form-group col col-md-4 col-sm-6">
                        <label>QC Required?</label>
                        <select required class="form-control select2 qc_required" name="qc_required">
                          <option value=""></option>
                          <option value="1">Yes</option>
                          <option value="0">No</option>
                        </select>
                      </div>

                      <label for="" class="col col-md-4 col-sm-6">
                        Select Tray
                        <div class="form-group">
                          <input type="text" class="tray_id form-control" required name="tray_id">
                          <span class="help-block"></span>
                        </div>
                      </label>

                    </div>
                    <!-- row ended -->
                  </div>
                  <!-- /.box-body -->
                </div>

                <div class="box">
                  <div class="box-header">
                    <h3 class="box-title">Items</h3>
                  </div>
                  <!-- /.box-header -->
                  <div class="box-body">

                    <?php $row_id = 1;?>
                    <table id="items_table" class="table table-bordered">
                      <thead>
                        <tr>
                          <th>S.No</th>
                          <th>IMEI</th>
                          <th>Model/Details</th>
                          <th>Color</th>
                          <th>Grade</th>
                          <th>Brand</th>
                          <th>GBs</th>
                          <th>Actions</th>
                          <th>Print</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td class="row-id">
                            <?php echo $row_id;?>
                          </td>
                          <td>
                            <div class="form-group">
                              <input type="text" class="form-control imei-field" name="imei_field[]"
                              tabindex="" required>
                              <span class="help-block imei-help-block"></span>
                              <svg class="code727 code1"></svg>
                            </div>
                          </td>
                          <td>
                            <input type="text" class="form-control details-field" name="details_field[]" >
                          </td>
                          <td>
                            <input type="text" class="form-control color-field" name="color_field[]">
                          </td>
                          <td>
                            <select class="form-control grade-field" name="grade_field[]" >
                              <option value="">select</option>
                              <?php 
                                $fetch_grades = mysqli_query($conn,"select * from tbl_grades");
                                while($item = mysqli_fetch_assoc($fetch_grades)):?>
                                  <option value="<?php echo $item['grade_id'];?>"><?php echo $item['title']; ?></option>
                                <?php endwhile;?>
                            </select>
                          </td>
                          <td>
                            <select class="form-control brand-field" name="brand_field[]" >
                              <!-- <option value="">select</option> -->
                              <?php while($item = mysqli_fetch_assoc($fetch_categories)):?>
                                  <option value="<?php echo $item['category_id'];?>"><?php echo $item['title']; ?></option>
                                <?php endwhile;?>
                            </select>
                          </td>
                          <td>
                            <select class="form-control gb-field" name="gb_field[]" >
                                <option value="">select</option>
                                <option value="4">4gb</option>
                                <option value="8">8gb</option>
                                <option value="16">16gb</option>
                                <option value="24">24gb</option>
                                <option value="32">32gb</option>
                                <option value="64">64gb</option>
                                <option value="128">128gb</option>
                                <option value="256">256gb</option>
                                <option value="512">512gb</option>
                            </select>
                          </td>
                          <td></td>
                          <td>
                            <label class="btn btn-success print_tag">
                              <i class="fa fa-print"></i>
                            </label>
                          </td>
                        </tr>
                        <tr class="add-new-row">
                          <td colspan="8">
                            <!-- <button class="pull-right btn btn-warning add_row btn-block"><i class="fa fa-plus"></i> New Item</button> -->
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <hr>
                    <p class="pull-left">
                      <b>Total items: </b> <span class="total_items">1</span>
                    </p>
                    <button class="btn btn-primary btn-lg booking-completed pull-right">Booking Completed</button>
                    <button class="pull-right btn btn-lg btn-success submit-form">Submit</button>
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

  <!-- error beep -->
  <audio id="myAudio">
    <source src="../../error-beep.mp3" type="audio/mp3">
      Your browser does not support the audio element.
  </audio>
  <!-- /error beep -->

  <select class="hide tray_collection no-print">
    <?php 
      while($tray = mysqli_fetch_assoc($fetch_trays)):
    ?>
      <option value="<?php echo $tray['tray_id'];?>">
        <?php echo $tray['title'];?>        
      </option>
    <?php endwhile;?>
  </select>

  <div class="tag-container">
  </div>

  <!-- loading screen on validtion -->
  <div class="page-loader">
    <i class="fa fa-spinner fa-spin"></i>
  </div>



<?php include $global_url."footer.php";?>
<script src="new_purchase_script.js"></script>

<script>

    // page state
    let state = {
      formSubmitted : false,
      isValid: true
    }

    // purchase details
    let new_pur_id = document.querySelector('.purchase_id').value,
        purchase_supplier = document.querySelector('.purchase_supplier'),
        purchase_date = document.querySelector('.purchase_date'),
        tray_id = document.querySelector('.tray_id'),
        qc_required = document.querySelector('.qc_required'),
        user_id = document.querySelector('.user_id').value;
        

    $(document).on('click','.submit-form',function(e){
        state.formSubmitted = true;
        if(!state.FormSubmitted){
          $(this).attr('disabled','disabled');

          // item details
          let imei_field = []; 
          document.querySelectorAll('.imei-field')
            .forEach(val{
              if(val.length < 15 || val.length > 16){
                alert('Invalid or empty IMEI');
                state.isValid = false;
              }              
              imei_field.push(val.value)
            });
          
          brand_field = []; 
          document.querySelectorAll('.brand-field')
            .forEach(val=>brand_field.push(val.value));
          
          details_field = []; 
          document.querySelectorAll('.details-field')
            .forEach(val=>details_field.push(val.value));
          
          color_field = []; 
          document.querySelectorAll('.color-field')
            .forEach(val=>color_field.push(val.value));
          
          grade_field = []; 
          document.querySelectorAll('.grade-field')
            .forEach(val=>grade_field.push(val.value));
          
          gb_field = []; 
          document.querySelectorAll('.gb-field')
            .forEach(val=>gb_field.push(val.value ));
          console.log(imei_field.length)
          if(imei_field[0].length >= 1){
            $.ajax({
              'type': "POST",
              'url': "includes/new_purchase_script.php",
              'data': {
                new_pur_id,
                purchase_supplier:purchase_supplier.value,
                purchase_date:purchase_date.value,
                tray_id:tray_id.value,
                qc_required:qc_required.value,
                user_id,
                imei_field,
                brand_field,
                details_field,
                color_field,
                grade_field,
                gb_field
              },
              'success': function (data) {
              },
              'error':(error) => {
                console.log('Program Error ',error);
              }
            }); //ajax endeda

            window.location.href= `purchase_details.php?pur_id=${new_pur_id}&email=1`;
          }
          else{
            alert('Error: IMEI Missing');
            e.preventDefault();
          }

        }
    })

</script>

</body>
</html>