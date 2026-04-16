<?php include '../db_config.php';  ?>
<?php $global_url="../"; ?>
<?php include "../authenticate.php" ?>
<?php 

  // NEW SUPPLIER ID
  $new_pur_id_query = mysqli_query($conn,"Select max(id) from tbl_suppliers")
  or die('Error:: ' . mysqli_error($conn));
  $order_id_result = mysqli_fetch_assoc($new_pur_id_query);
  $new_sup_id = 'SUP-'.($order_id_result['max(id)']+1);

// INSERTING NEW CATEGORY
if(isset($_POST['submit_supplier'])){

    $user_id = $_SESSION['user_id'];
    $today = date('Y-m-d');
    $date = date('Y-m-d');

  // INPUT LOG
    $new_log = mysqli_query($conn,"insert into tbl_log (ref,subject,
    date, user_id)
    values
    ('".$new_sup_id."','NEW SUPPLIER',
    '".$today."',".$user_id.")")
    or die('Error:: ' . mysqli_error($conn));

    $query = mysqli_query($conn,"insert into tbl_suppliers (
    supplier_id,
    name, 
    phone, 
    address, 
    city,
    country,
    email,
    user_id) values (
    '".$new_sup_id."',
    '".$_POST['supplier_name']."',
    '".$_POST['supplier_phone']."',
    '".$_POST['supplier_address']."',
    '".$_POST['supplier_city']."',
    '".$_POST['supplier_country']."',
    '".$_POST['supplier_email']."',
    ".$user_id."
    )")
    or die('Error:: '.mysqli_error($conn));

    // REFRESH CURRENT PAGE
    header("location:manage_suppliers.php");
}

?>
<?php include "../header.php";?>

  <!-- Content Wrapper. Contains page content -->
  <div class="content-wrapper">
    <!-- Content Header (Page header) -->
      <section class="content-header">
      <h1>
        New Supplier
      </h1>
    </section>

    <!-- Main content -->
    <section class="content">

      <!-- form started -->
      <form action="<?php echo $_SERVER["PHP_SELF"];?>" method="post" class="supplier_form">

      <!-- row  -->
      <div class="row">
      <!-- col -->
        <div class="col-md-10">
        <!-- box started-->
          <div class="box box-success">
            <div class="box-body">
              <div class="row"> 
                <div class="form-group col-md-2">
                  <label>Supplier ID</label>
                  <input type="text" class="form-control" disabled="" value="<?php echo $new_sup_id; ?>">
                </div>
                <div class="form-group col-md-5">
                    <label>Supplier Name</label>
                    <input type="text" class="form-control" required name="supplier_name">
                </div>
                <div class="form-group col-md-4">
                    <label>Phone</label>
                    <input type="text" class="form-control" name="supplier_phone">
                </div>
        
              </div>

              <div class="row"> 
                <div class="form-group col-md-5">
                    <label>Email</label>
                    <input type="text" class="form-control" name="supplier_email">
                </div>
                <div class="form-group col-md-5">
                    <label>VAT</label>
                    <input type="text" class="form-control" name="supplier_vat">
                </div>
              </div>

              <div class="row"> 
                <div class="form-group col-md-12">
                    <label>Address 1</label>
                    <textarea class="form-control" rows="1" placeholder="" name="supplier_address"></textarea>
                </div>
                <div class="form-group col-md-12">
                    <label>Address 2</label>
                    <textarea class="form-control" rows="1" placeholder="" name="supplier_address2"></textarea>
                </div>
              </div>

              <div class="row"> 
                <div class="form-group col-md-4">
                    <label>City</label>
                    <input type="text" class="form-control" name="supplier_city">
                </div>
                <div class="form-group col-md-4">
                    <label>Country</label>
                    <input type="text" class="form-control" name="supplier_country">
                </div>
                <div class="form-group col-md-4">
                    <label>Post code</label>
                    <input type="text" class="form-control" name="supplier_postcode">
                </div>
              </div>


              <input type="submit" name="submit_supplier" value="Add Supplier" class="btn btn-lg btn-success pull-right" id="submit_supplier">

            </div>
            <!-- /.box-body -->
          </div>
          <!-- /.box -->
        </div>
        <!-- col -->

      </div>
      <!-- row -->

    </form>
    <!-- form ended -->

    </section>
    <!-- /.content -->
  </div>
  <!-- /.content-wrapper -->

<?php include $global_url."footer.php";?>


</body>
</html>



