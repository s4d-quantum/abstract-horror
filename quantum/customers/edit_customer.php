<?php $global_url="../"; ?>
<?php //error_reporting(E_ALL & ~E_NOTICE); ?>
<?php include '../db_config.php';  ?>
<?php include "../authenticate.php" ?>
<?php 

// DISPLAYING CATEGORY ID
$new_cst_id = $_GET['edit'];
$query1 = mysqli_query($conn,"select * from tbl_customers where customer_id='".$new_cst_id."'");
$result = mysqli_fetch_assoc($query1);
$opening_balance = 0;

// INSERTING NEW CATEGORY
if(isset($_POST['submit_customer'])){
  
  $user_id = $_SESSION['user_id'];
  $date = date('Y-m-d');

  // INPUT LOG
  $new_log = mysqli_query($conn,"insert into tbl_log (ref,subject,
  date, user_id)
  values
  ('".$new_cst_id."','EDIT CUSTOMER',
  '".$date."',".$user_id.")")
  or die('Error:: ' . mysqli_error($conn));

  $query = mysqli_query($conn,"update tbl_customers set  
  name='".$_POST['customer_name']."', 
  email='".$_POST['customer_email']."', 
  phone='".$_POST['customer_phone']."', 
  address='".$_POST['customer_address']."', 
  city = '".$_POST['customer_city']."', 
  postcode = '".$_POST['customer_postcode']."', 
  vat = '".$_POST['customer_vat']."', 
  address2 = '".$_POST['customer_address2']."', 
  country='".$_POST['customer_country']."'
  where customer_id='".$new_cst_id."'")
    or die('Error:: '.mysqli_error($conn)); 
    header("location:manage_customers.php");
  }

?>

<?php include "../header.php";
?>

  <!-- Content Wrapper. Contains page content -->
  <div class="content-wrapper">
    <!-- Content Header (Page header) -->
      <section class="content-header">
      <h1>
        Edit Customer
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
                  <label>Customer ID</label>
                  <input type="text" class="form-control" disabled="" value="<?php echo $new_cst_id; ?>">
                </div>
                <div class="form-group col-md-5">
                    <label>Customer Name</label>
                    <input type="text" class="form-control" name="customer_name" value="<?php echo $result['name']; ?>" required>
                </div>
                <div class="form-group col-md-4">
                    <label>Phone</label>
                    <input type="text" class="form-control" name="customer_phone" value="<?php echo $result['phone']; ?>" >
                </div>
              </div>

              <div class="row"> 
                <div class="form-group col-md-4">
                    <label>Email</label>
                    <input type="text" class="form-control" name="customer_email" value="<?php echo $result['email']; ?>">
                </div>
                <div class="form-group col-md-4">
                    <label>VAT</label>
                    <input type="text" class="form-control" name="customer_vat" value="<?php echo $result['vat']; ?>">
                </div>
              </div>

              <div class="row"> 
                <div class="form-group col-md-12">
                    <label>Address 1</label>
                    <textarea class="form-control" rows="1" placeholder="" name="customer_address"><?php echo $result['address']; ?></textarea>
                </div>
                <div class="form-group col-md-12">
                    <label>Address 2</label>
                    <textarea class="form-control" rows="1" placeholder="" name="customer_address2"><?php echo $result['address2']; ?></textarea>
                </div>
              </div>

              <div class="row"> 
                <div class="form-group col-md-4">
                    <label>City</label>
                    <input type="text" class="form-control" name="customer_city" value="<?php echo $result['city']; ?>" >
                </div>
                <div class="form-group col-md-3">
                    <label>Country</label>
                    <input type="text" class="form-control" name="customer_country" value="<?php echo $result['country']; ?>">
                </div>
                <div class="form-group col-md-3">
                    <label>Post code</label>
                    <input type="text" class="form-control" name="customer_postcode" value="<?php echo $result['postcode']; ?>">
                </div>
              </div>
              <input type="submit" name="submit_customer" value="Save Customer" class="btn btn-lg btn-success pull-right">

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

 