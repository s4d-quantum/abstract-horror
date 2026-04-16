<?php $global_url="../"; ?>
<?php include '../db_config.php';  ?>
<?php include "../authenticate.php" ?>
<?php 

  // NEW CUSTOMER ID
  $new_pur_id_query = mysqli_query($conn,"Select max(id) from tbl_customers")
  or die('Error:: ' . mysqli_error($conn));
  $order_id_result = mysqli_fetch_assoc($new_pur_id_query);
  $new_cst_id = 'CST-'.($order_id_result['max(id)']+1);


// INSERTING NEW CATEGORY
if(isset($_POST['submit_customer'])){

  $user_id = $_SESSION['user_id'];
  $date = date('Y-m-d');

  // INPUT LOG
  $new_log = mysqli_query($conn,"insert into tbl_log (ref,subject,
  date, user_id)
  values
  ('".$new_cst_id."','NEW CUSTOMER',
  '".$date."',".$user_id.")")
  or die('Error:: ' . mysqli_error($conn));

  $today = date('Y-m-d');
      $query = mysqli_query($conn,"insert into tbl_customers (
      customer_id,
      name,
      email, 
      phone, 
      address,
      address2,
      city,
      country,
      postcode,
      vat) 
      values (
      '".$new_cst_id."',
      '".$_POST['customer_name']."',
      '".$_POST['customer_email']."',
      '".$_POST['customer_phone']."',
      '".$_POST['customer_address']."',
      '".$_POST['customer_address2']."',
      '".$_POST['customer_city']."',
      '".$_POST['customer_country']."',
      '".$_POST['customer_postcode']."',
      '".$_POST['customer_vat']."')")
        or die('Error:: '.mysqli_error($conn)); 

      // REFRESH CURRENT PAGE
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
        New Customer
      </h1>
    </section>

    <!-- Main content -->
    <section class="content">

      <!-- form started -->
      <form action="<?php echo $_SERVER["PHP_SELF"];?>" method="post">

      <!-- row  -->
      <div class="row">
      <!-- col -->
        <div class="col-md-10">
        <!-- box started-->
          <div class="box box-success">
            <div class="box-body">
              <div class="row"> 
                <div class="form-group col-md-3">
                  <label>Customer ID</label>
                  <input type="text" class="form-control" disabled="" value="<?php echo $new_cst_id; ?>">
                </div>
                <div class="form-group col-md-5">
                    <label>Customer Name</label>
                    <input type="text" class="form-control" name="customer_name" required>
                </div>
                <div class="form-group col-md-4">
                    <label>Phone</label>
                    <input type="text" class="form-control" name="customer_phone">
                </div>
              </div>

              <div class="row"> 
                <div class="form-group col-md-4">
                    <label>Email</label>
                    <input type="email" class="form-control" name="customer_email">
                </div>
                <div class="form-group col-md-4">
                    <label>VAT</label>
                    <input type="text" class="form-control" name="customer_vat">
                </div>
              </div>

              <div class="row"> 
                <div class="form-group col-md-12">
                    <label>Address 1</label>
                    <textarea class="form-control" rows="1" placeholder="" name="customer_address"></textarea>
                </div>
                <div class="form-group col-md-12">
                    <label>Address 2</label>
                    <textarea class="form-control" rows="1" placeholder="" name="customer_address2"></textarea>
                </div>
              </div>

              <div class="row"> 
                <div class="form-group col-md-4">
                    <label>City</label>
                    <input type="text" class="form-control" name="customer_city">
                </div>
                <div class="form-group col-md-4">
                    <label>Country</label>
                    <input type="text" class="form-control" name="customer_country">
                </div>
                <div class="form-group col-md-4">
                    <label>Post code</label>
                    <input type="text" class="form-control" name="customer_postcode">
                </div>
              </div>

              <input type="submit" name="submit_customer" value="Add Customer" class="btn btn-lg btn-success pull-right">

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
