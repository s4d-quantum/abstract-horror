<?php
// hide all errors and notices
error_reporting(0);

include 'db_config.php';


  // fetch logo
  $fetch_logo_query = mysqli_query($conn,"Select * from tbl_settings");
  $fetch_logo_result = mysqli_fetch_assoc($fetch_logo_query);

  // BackMarket unprocessed orders (last 4 days)
  $bm_unprocessed_count = 0;
  $bm_count_sql = "SELECT COUNT(DISTINCT order_id) AS total_orders
                   FROM tbl_imei_sales_orders
                   WHERE is_completed = '0'
                     AND customer_id = 'CST-78'
                     AND date >= NOW() - INTERVAL 4 DAY";
  if ($bm_result = mysqli_query($conn, $bm_count_sql)) {
    $bm_row = mysqli_fetch_assoc($bm_result);
    $bm_unprocessed_count = (int)$bm_row['total_orders'];
  }

  // Count of unprocessed non-backmarket sales orders (for the sales orders menu item)
  $non_bm_unprocessed_count = 0;
  $non_bm_count_sql = "SELECT COUNT(DISTINCT order_id) AS total_orders
                       FROM tbl_imei_sales_orders
                       WHERE is_completed = '0'
                         AND date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
                         AND customer_id != 'CST-78'";
  if ($non_bm_result = mysqli_query($conn, $non_bm_count_sql)) {
    $non_bm_row = mysqli_fetch_assoc($non_bm_result);
    $non_bm_unprocessed_count = (int)$non_bm_row['total_orders'];
  }

  // Count of open feedback items for sidebar badge
  $feedback_open_count = 0;
  $feedback_count_sql = "SELECT COUNT(*) AS total_open FROM tbl_feedback WHERE status = 'open'";
  if ($feedback_result = mysqli_query($conn, $feedback_count_sql)) {
    $feedback_row = mysqli_fetch_assoc($feedback_result);
    $feedback_open_count = (int)$feedback_row['total_open'];
  }

?>


<!DOCTYPE html>
<html>

<head>
  <meta charset="utf-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Quantum | S4D Limited</title>

  <meta content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" name="viewport">
  <link rel="stylesheet" href="<?php echo $global_url; ?>assets/css/bundle.css">

  <script src="<?php echo $global_url; ?>users/header-user-inactive-script.js" defer></script>
  <script src="<?php echo $global_url; ?>assets/js/moment.min.js" defer></script>
  <script src="<?php echo $global_url; ?>dashboard/dpd/fetch_dpd_status.js" defer></script>

  <style>
  .example-modal .modal {
    position: relative;
    top: auto;
    bottom: auto;
    right: auto;
    left: auto;
    display: block;
    z-index: 1;
  }

  .example-modal .modal {
    background: transparent !important;
  }
  </style>

</head>

<body class="hold-transition skin-green sidebar-mini">
  <div class="user-id hidden"><?php echo $_SESSION['user_id'];?></div>


  <!-- USER INACTIVE MARKUP -->
  <div class="user-inactive-wrapper">
    <div class="login-box">
      <div>
        <a style="display:block; text-align:center;" href=""><img
            src="<?php echo $global_url; ?>assets/uploads/<?php echo $fetch_logo_result['logo_image']; ?>"
            style="width:150px;margin:0 auto;" /></a>
      </div>
      <!-- /.login-logo -->
      <div class="login-box-body">
        <p class="login-box-msg">Sign in as <?php echo $_SESSION['user_name']; ?></p>

        <form action="" method="post">
          <div class="form-group has-feedback">
            <input type="email" class="user_email form-control" placeholder="Email" required />
            <span class="glyphicon glyphicon-envelope form-control-feedback"></span>
          </div>
          <div class="form-group has-feedback">
            <input type="password" class="user_password form-control" placeholder="Password" required />
            <span class="glyphicon glyphicon-lock form-control-feedback"><?php
          ?></span>
          </div>
          <div class="row">
            <div class="col-xs-12">
              <button type="submit" class="btn btn-primary btn-block btn-flat inactive_form_submit">Sign In</button>
              <p class="inactive-form-error"></p>
              <a href="<?php echo $global_url; ?>login.php?logout=1" class="btn btn-warning btn-block"> Not
                <?php echo $_SESSION['user_name']; ?>?</a>
            </div>
          </div>
          <!-- /.col -->
        </form>


      </div>

      <!-- /.login-box-body -->
    </div>
  </div>
  <!-- USER INACTIVE MARKUP -->


  <div class="wrapper">

    <header class="main-header">

      <nav class="navbar navbar-static-top">
        <!-- Logo -->
        <a href="<?php echo $global_url; ?>index.php" class="logo">
          <!-- mini logo for sidebar mini 50x50 pixels -->
          <span class="logo-mini"><?php echo $company_info['company_title']; ?></span>
          <!-- logo for regular state and mobile devices -->
          <span class="logo-lg"><?php echo $company_info['company_title']; ?></span>
        </a>

        <ul class="nav navbar-nav pull-right">
          <li>
            <a href="javascript:void(0);">
              <?php if($_SESSION['user_role'] == 'admin'):?>
                <?php echo $_SESSION['user_name']; ?>
                <span style="color:lightgreen;"><?php echo '(Admin)'; ?> </span>
              <?php else: ?>
                <?php echo $_SESSION['user_name']; ?>
                <?php endif; ?>
            </a>
          </li>
          <li>
            <a href="<?php echo $global_url; ?>index.php?logout=true"><img style="filter:invert(1); width:21px;"src="<?php echo $global_url; ?>assets/img/logout.png" /></a>
          </li>
        </ul>
      </nav>
    </header>

    <!-- Left side column. contains the logo and sidebar -->
    <aside class="main-sidebar">
      <!-- sidebar: style can be found in sidebar.less -->
      <section class="sidebar">

        <!-- sidebar menu: : style can be found in sidebar.less -->
        <ul class="sidebar-menu">
          <li class="header">MAIN NAVIGATION</li>
          <li class="treeview">
            <a href="<?php echo $global_url; ?>index.php">
              <i class="fa fa-dashboard"></i> <span>Dashboard</span>
            </a>
          </li>
          <li class="treeview">
            <a href="<?php echo $global_url; ?>products/products_menu.php">
              <i class="fa fa-tags"></i>
              <span>Inventory</span>
            </a>
          </li>
          <li class="treeview">
            <a href="<?php echo $global_url; ?>purchases/purchases_menu.php">
              <i class="fa fa-plus-square"></i>
              <span>Goods In</span>
            </a>
          </li>
          <li class="treeview">
            <a href="<?php echo $global_url; ?>repair/repair_menu.php">
              <i class="fa fa-check-square-o"></i>
              <span>Repair</span>
            </a>
          </li>
          <li class="treeview">
            <a href="<?php echo $global_url; ?>qc/qc_menu.php">
              <i class="fa fa-check-square-o"></i>
              <span>QC</span>
            </a>
          </li>
          <li class="treeview">
            <a href="<?php echo $global_url; ?>orders/order_menu.php">
              <i class="fa fa-arrow-up"></i>
              <span>Goods Out</span>
            </a>
          </li>
          <li class="treeview">
            <a href="#">
              <i class="fa fa-inbox"></i>
              <span>Sales Orders</span>
              <span class="pull-right-container">
                <i class="fa fa-angle-left pull-right"></i>
              </span>
            </a>
            <ul class="treeview-menu">
              <li>
                <a href="<?php echo $global_url; ?>sales/sales_menu.php">
                  <i class="fa fa-circle-o"></i>
                  Sales Orders
                  <?php if (!empty($non_bm_unprocessed_count)) { ?>
                    <span class="label label-warning pull-right"><?php echo $non_bm_unprocessed_count; ?></span>
                  <?php } ?>
                </a>
              </li>
              <li>
                <a href="<?php echo $global_url; ?>sales/imei_orders/manage_backmarket_orders.php">
                  <i class="fa fa-circle-o"></i>
                  BackMarket
                  <?php if (!empty($bm_unprocessed_count)) { ?>
                    <span class="label label-warning pull-right"><?php echo $bm_unprocessed_count; ?></span>
                  <?php } ?>
                </a>
              </li>
            </ul>
          </li>
          <li class="treeview">
            <a href="<?php echo $global_url; ?>old_Stock/manage_stocks.php">
              <i class="fa fa-pie-chart"></i>
              <span>Aged stock</span>
            </a>
          </li>
          <li class="treeview">
            <a href="<?php echo $global_url; ?>customers/customers_menu.php">
              <i class="fa fa-users"></i>
              <span>Customers</span>
            </a>
          </li>
          <li>
            <a href="<?php echo $global_url; ?>suppliers/suppliers_menu.php">
              <i class="fa fa-users"></i>
              <span>Suppliers</span>
            </a>
          </li>
          <li>
            <a href="<?php echo $global_url; ?>feedback/feedback.php">
              <i class="fa fa-commenting"></i>
              <span>Feedback</span>
              <?php if (!empty($feedback_open_count)) { ?>
                <span class="label label-warning pull-right"><?php echo $feedback_open_count; ?></span>
              <?php } ?>
            </a>
          </li>
          <li class="hide">
            <a href="<?php echo $global_url; ?>reports/reports_menu.php">
              <i class="fa fa-file-text"></i> <span>Reports</span>
            </a>
          </li>
          <?php if($_SESSION['user_role'] == 'admin'):?>
          <li>
            <a href="<?php echo $global_url; ?>users/manage_users.php">
              <i class="fa fa-gear"></i> <span>Users</span>
            </a>
          </li>
          <li>
            <a href="<?php echo $global_url; ?>settings/settings_menu.php">
              <i class="fa fa-gear"></i> <span>Settings</span>
            </a>
          </li>
          <?php endif; ?>
        </ul>
      </section>
      <!-- /.sidebar -->
    </aside>


    <input type="text" class="hide dpd_u" value="<?php echo $company_info['dpd_user']; ?>">
    <input type="text" class="hide dpd_p" value="<?php echo $company_info['dpd_pass']; ?>">
    <!-- /FETCH DPD CREDENTIALS  -->
