<?php $global_url="../"; ?>
<?php include '../db_config.php';  ?>
<?php include "../authenticate.php" ?>
<?php 

  $fetch_logo_query = mysqli_query($conn,"Select * from tbl_settings");
  $fetch_logo_result = mysqli_fetch_assoc($fetch_logo_query);