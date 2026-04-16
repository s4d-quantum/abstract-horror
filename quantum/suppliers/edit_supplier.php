<?php //error_reporting(E_ALL & ~E_NOTICE); ?>
<?php include '../db_config.php';  ?>
<?php $global_url="../"; ?>
<?php include "../authenticate.php" ?>
<?php 

// DISPLAYING CATEGORY ID
$new_sup_id = $_GET['edit'];
$query1 = mysqli_query($conn,"select * from tbl_suppliers where supplier_id='".$new_sup_id."'");
$result = mysqli_fetch_assoc($query1);

// INSERTING NEW CATEGORY
if(isset($_POST['submit_supplier'])){
  
  $user_id = $_SESSION['user_id'];
  $date = date('Y-m-d');

  // INPUT LOG
  $new_log = mysqli_query($conn,"insert into tbl_log (ref,subject,
  date, user_id)
  values
  ('".$new_cst_id."','EDIT SUPPLIER',
  '".$date."',".$user_id.")")
  or die('Error:: ' . mysqli_error($conn));

  $query = mysqli_query($conn,"update tbl_suppliers set  
  name='".$_POST['supplier_name']."',
  email='".$_POST['supplier_email']."',
  phone='".$_POST['supplier_phone']."', 
  address='".$_POST['supplier_address']."', 
  address2='".$_POST['supplier_address2']."', 
  city = '".$_POST['supplier_city']."',
  country = '".$_POST['supplier_country']."',
  vat = '".$_POST['supplier_vat']."',
  postcode = '".$_POST['supplier_postcode']."'
  where supplier_id='".$new_sup_id."'")
    or die('Error:: '.mysqli_error($conn)); 
    header("location:manage_suppliers.php");
  }

?>
<?php include "../header.php";?>

  <!-- Content Wrapper. Contains page content -->
  <div class="content-wrapper">
    <!-- Content Header (Page header) -->
      <section class="content-header">
      <h1>
        Edit supplier
      </h1>
    </section>

    <!-- Main content -->
    <section class="content">

      <!-- form started -->
      <form enctype="multipart/form-data" action="" method="post">

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
                    <label>Name</label>
                    <input type="text" class="form-control" required name="supplier_name"
                    value="<?php echo $result['name'];?>">
                </div>
                <div class="form-group col-md-5">
                    <label>Phone</label>
                    <input type="text" class="form-control" name="supplier_phone" 
                    value="<?php echo $result['phone'];?>">
                </div>
              </div>

              <div class="row"> 
                <div class="form-group col-md-4">
                  <label>Email</label>
                  <input type="text" class="form-control" name="supplier_email" 
                  value="<?php echo $result['email'];?>">
                </div>
                <div class="form-group col-md-4">
                    <label>VAT</label>
                    <input type="text" class="form-control" name="supplier_vat" 
                    value="<?php echo $result['vat'];?>">
                </div>
              </div>

              <div class="row"> 
                <div class="form-group col-md-12">
                    <label>Address 1</label>
                    <textarea class="form-control" rows="1" placeholder="" 
                    name="supplier_address"><?php echo $result['address'];?></textarea>
                </div>
                <div class="form-group col-md-12">
                    <label>Address 2</label>
                    <textarea class="form-control" rows="1" placeholder="" 
                    name="supplier_address2"><?php echo $result['address2'];?></textarea>
                </div>
              </div>

              <div class="row"> 
                <div class="form-group col-md-4">
                    <label>City</label>
                    <input type="text" class="form-control" name="supplier_city" 
                    value="<?php echo $result['city'];?>">
                </div>
                <div class="form-group col-md-4">
                    <label>Country</label>
                    <input type="text" class="form-control" name="supplier_country" 
                    value="<?php echo $result['country'];?>">
                </div>
                <div class="form-group col-md-4">
                    <label>Post code</label>
                    <input type="text" class="form-control" name="supplier_postcode" 
                    value="<?php echo $result['postcode'];?>">
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