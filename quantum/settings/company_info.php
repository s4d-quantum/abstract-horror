<?php $global_url="../"; ?>
<?php include '../db_config.php';  ?>
<?php include "../authenticate.php" ?>
<?php 

  $fetch_logo_query = mysqli_query($conn,"Select * from tbl_settings");
  $fetch_logo_result = mysqli_fetch_assoc($fetch_logo_query);

  mysqli_select_db($conn, 's4d_user_accounts');                    
  $fetch_accounts = mysqli_query($conn,"Select user_email as email from tbl_accounts where user_id=".$_SESSION['user_id']);
  $fetch_accounts_result = mysqli_fetch_assoc($fetch_accounts);
  mysqli_select_db($conn, $_SESSION['user_db']);                    

?>

<?php include "../header.php";
?>

<!-- Content Wrapper. Contains page content -->
<div class="content-wrapper">
  <!-- Content Header (Page header) -->
  <section class="content-header">
    <h1>
      Company Info
    </h1>
  </section>

  <!-- Main content -->
  <section class="content">

    <!-- form started -->
    <form method="post" enctype="multipart/form-data" id="company_info">

      <!-- row  -->
      <div class="row">
        <!-- col -->
        <div class="col-md-10">
          <!-- box started-->
          <div class="box box-success">
            <div class="box-body">

              <!-- Upload Logo -->
              <div class="row">
                <h4 class="col-md-12">Company Logo</h4>
                <div class="form-group col-md-5">
                  <img onerror="../assets/img/demo_logo.jpg" height="160"
                    style="border:1px solid #999; margin-bottom:5px;"
                    src="../assets/uploads/<?php echo $fetch_logo_result['logo_image']; ?>" />
                  <input type="file" name="fileToUpload" />
                </div>
              </div>

              <div class="row">
                <div class="form-group col-md-4">
                  <label>Company Title</label>
                  <input type="text" required class="form-control" name="title"
                    value="<?php echo $fetch_logo_result['company_title'];?>">
                </div>
                <div class="form-group col-md-4">
                  <label>Email</label>
                  <input type="email" required class="form-control" disabled name="email"
                    value="<?php echo $fetch_accounts_result['email'];?>">
                </div>
                <div class="form-group col-md-4">
                  <label>Phone</label>
                  <input type="phone" class="form-control" name="phone"
                    value="<?php echo $fetch_logo_result['phone'];?>">
                </div>
              </div>

              <div class="row">
                <div class="form-group col-md-6">
                  <label>Address</label>
                  <input type="text" class="form-control" name="address"
                    value="<?php echo $fetch_logo_result['address'];?>">
                </div>
                <div class="form-group col-md-3">
                  <label>City</label>
                  <input type="text" class="form-control" name="city" value="<?php echo $fetch_logo_result['city'];?>">
                </div>
                <div class="form-group col-md-3">
                  <label>Country</label>
                  <input type="text" class="form-control" name="country"
                    value="<?php echo $fetch_logo_result['country'];?>">
                </div>
              </div>

              <div class="row">
                <div class="form-group col-md-3">
                  <label>Post Code</label>
                  <input type=" text" class="form-control" name="postcode"
                    value="<?php echo $fetch_logo_result['postcode'];?>">
                </div>
                <div class="form-group col-md-3">
                  <label>VAT</label>
                  <input type=" text" class="form-control" name="vat" value="<?php echo $fetch_logo_result['vat'];?>">
                </div>
                <div class="form-group col-md-3">
                  <label>EROI NO</label>
                  <input type=" text" class="form-control" name="eroi_no"
                    value="<?php echo $fetch_logo_result['eroi_no'];?>">
                </div>
              </div>

              <div class="row">
                <div class="form-group col-md-4">
                  <label>Company Registration No</label>
                  <input type=" text" class="form-control" name="company_registration_no"
                    value="<?php echo $fetch_logo_result['company_registration_no'];?>">
                </div>
              </div>

              <?php if($_SESSION['user_role'] === 'admin'): ?>
              <div class="row">
                <hr />
                <h4 class="col-md-12">DPD Credentials</h4>
                <div class="form-group col-md-5">
                  <label>Username</label>
                  <input type="text" class="form-control" name="dpd_user"
                    value="<?php echo $fetch_logo_result['dpd_user'];?>">
                </div>
                <div class="form-group col-md-5">
                  <label>Password</label>
                  <input type="text" class="form-control" name="dpd_pass"
                    value="<?php echo $fetch_logo_result['dpd_pass'];?>">
                </div>
              </div>
              <?php endif; ?>

              <input type="submit" value="Save" class="btn btn-lg btn-success pull-right">

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

<script src="../assets/dist/bundle.js"></script>
<script src="includes/company_info.js"></script>

<?php include $global_url."footer.php";?>

</body>

</html>