
<?php
// Export to CSV functionality
if (isset($_GET['export_csv'])) {
    include 'db_config.php';
    
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename=IMEI_Goods_In.csv');
    
    $output = fopen('php://output', 'w');
    fputcsv($output, ['Purchase ID', 'Date', 'QC Required', 'Priority', 'Supplier', 'Total']);
    
    $query = "SELECT DISTINCT pr.purchase_id as pur_id, pr.date, pr.qc_required, pr.priority, 
                     sup.name as supplier,
                     (SELECT COUNT(purchase_id) FROM tbl_purchases WHERE purchase_id = pr.purchase_id) as total
              FROM tbl_purchases as pr
              INNER JOIN tbl_suppliers as sup ON sup.supplier_id = pr.supplier_id
              WHERE priority > 0
              ORDER BY pur_id DESC;";
              
    $result = mysqli_query($conn, $query);
    
    while ($row = mysqli_fetch_assoc($result)) {
        fputcsv($output, $row);
    }
    fclose($output);
    exit;
}
?>

<?php $global_url=""; ?>
<?php error_reporting(E_ERROR); ?>
<?php 

session_start();

include 'db_config.php';  
include './shared/logout.php';

$date = date('Y-m-d');

// BackMarket unprocessed orders (last 4 days) for sidebar badge
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

// All unprocessed sales orders (distinct order_id)
$sales_unprocessed_count = 0;
$sales_count_sql = "SELECT COUNT(DISTINCT order_id) AS total_unique_orders 
                    FROM tbl_imei_sales_orders 
                    WHERE is_completed = '0'";
if ($sales_result = mysqli_query($conn, $sales_count_sql)) {
  $sales_row = mysqli_fetch_assoc($sales_result);
  $sales_unprocessed_count = (int)$sales_row['total_unique_orders'];
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
// ..logout
logout();

// ..redirect if not loggedin
if(!isset($_SESSION['user_role'])){
  header("location:login.php");
}

if(isset($_SESSION['user_role'])){
  $role = $_SESSION['user_role'];
}

?>
<!DOCTYPE html>
<html>

<head>
  <meta charset="utf-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Quantum | S4D Limited</title>

  <!-- Tell the browser to be responsive to screen width -->
  <meta content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" name="viewport">
  <link rel="stylesheet" href="<?php echo $global_url; ?>assets/css/bundle.css">

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
  <div class="wrapper">

    <header class="main-header">

      <!-- Header Navbar: style can be found in header.less -->
      <nav class="navbar navbar-static-top">

        <!-- Logo -->
        <a href="<?php echo $global_url; ?>index.php" class="logo">
          <?php 
            // FETCH DPD CREDENTIALS 
            $fetch_query = mysqli_query($conn,"select company_title from tbl_settings")
              or die('Error: '.mysqli_error($conn)); 
              $company_info = mysqli_fetch_assoc($fetch_query);
          ?>

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
              <i class="fa fa-arrow-down"></i>
              <span>Goods In</span>
            </a>
          </li>
          <li class="treeview">
            <a href="<?php echo $global_url; ?>repair/repair_menu.php">
              <i class="fa fa-minus-square"></i>
              <span>Repair</span>
            </a>
          </li>
          <li class="treeview">
            <a href="<?php echo $global_url; ?>qc/qc_menu.php">
              <i class="fa fa-minus-square"></i>
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
            <a href="<?php echo $global_url; ?>old_stock/manage_stocks.php">
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


    <!-- Content Wrapper. Contains page content -->
    <div class="content-wrapper">
      <!-- Content Header (Page header) -->
      <section class="content-header">
        <h1>
          Dashboard
          <small>In Stock</small>
        </h1>
      </section>

      <div class="row">
        <div class="col-md-12">
          <div class="col-md-3">
            <!-- duplicate widgets -->
            <div class="duplicate-widgets">
              <!-- Widget: user widget style 1 -->
              <div class="box box-widget widget-user-2">
                <div class="box-footer no-padding">
                  <ul class="nav nav-stacked">

                    <li class="">
                      <a href="#" class="text-muted">
                        <i class="fa fa-inbox text-light-blue"></i>
                        <?php 
                          $fetch_imei_products = mysqli_query($conn,"select count(*) as total_items 
                          from tbl_imei where status = 1");
                          $imei_products = mysqli_fetch_assoc($fetch_imei_products);
                        ?>
                        IMEI Stock
                        <span class="pull-right text-bold">
                          <?php echo $imei_products['total_items'];?>
                        </span>
                      </a>
                    </li>

                    <li class="">
                      <a href="#">
                        <i class="fa fa-inbox text-light-blue"></i>
                        <?php 
                        $fetch_products = mysqli_query($conn,"select count(*) as total 
                        from tbl_serial_products where status = 1");
                        $products = mysqli_fetch_assoc($fetch_products);
                        ?>
                        Serial Stock
                        <span class="pull-right text-bold">
                          <?php echo $products['total'];?>
                        </span>
                      </a>
                    </li>

                    <li class="">
                      <a href="<?php echo $global_url; ?>sales/imei_orders/manage_all_orders.php">
                        <i class="fa fa-inbox text-light-blue"></i>
                        Sales orders to process
                        <span class="pull-right text-bold">
                          <?php echo $sales_unprocessed_count; ?>
                        </span>
                      </a>
                    </li>


                  </ul>
                </div>
              </div>
              <!-- /.widget-user -->
            </div>
          </div>

          <div class="col-md-3">
            <!-- duplicate widgets -->
            <div class="duplicate-widgets">
              <!-- Widget: user widget style 1 -->
              <div class="box box-widget widget-user-2">
                <div class="box-footer no-padding">
                  <ul class="nav nav-stacked">

                    <li class="">
                      <a href="#" class="text-center">
                        <?php 
                          $fetch_total_bookingout = mysqli_query($conn,"select count(item_imei) 
                          as total from tbl_orders where date='".$date."'");
                          $total_bookingout = mysqli_fetch_assoc($fetch_total_bookingout);
                        ?>
                        <?php 
                          $fetch_total_bookingin = mysqli_query($conn,"select count(item_imei) as total 
                          from tbl_purchases where date='".$date."'");
                          $total_bookingin = mysqli_fetch_assoc($fetch_total_bookingin);
                        ?>

                        <span class="text-bold pull-left">
                          <i class="fa fa-arrow-down text-blue"></i>&nbsp;
                          <?php echo $total_bookingin['total'];?>
                        </span>
                        IMEI
                        <span class="pull-right text-bold">
                          <i class="fa fa-arrow-up text-green"></i>&nbsp;
                          <?php echo $total_bookingout['total'];?>
                        </span>

                      </a>
                    </li>

                    <li class="">
                      <a href="#" class="text-center">
                        <?php 
                          $fetch_total_serial_bookingin = mysqli_query($conn,"select count(item_code) as total 
                          from tbl_serial_purchases where date='".$date."'");
                          $total_serial_bookingin = mysqli_fetch_assoc($fetch_total_serial_bookingin);
                        ?>
                        <?php 
                          $fetch_total_serial_bookingout = mysqli_query($conn,"select count(item_code) as total 
                          from tbl_serial_orders where date='".$date."'");
                          $total_serial_bookingout = mysqli_fetch_assoc($fetch_total_serial_bookingout);
                        ?>

                        <span class="text-bold pull-left">
                          <i class="fa fa-arrow-down text-blue"></i>&nbsp;
                          <?php echo $total_serial_bookingin['total'];?>
                        </span>
                        Serial
                        <span class="pull-right text-bold">
                          <i class="fa fa-arrow-up text-green"></i>&nbsp;
                          <?php echo $total_serial_bookingout['total'];?>
                        </span>
                      </a>
                    </li>


                  </ul>
                </div>
              </div>
              <!-- /.widget-user -->
            </div>
          </div>


          <?php if($_SESSION['user_role'] === 'admin'):?>
          <div class="col-md-3">
            <!-- duplicate widgets -->
            <div class="duplicate-widgets">
              <!-- Widget: user widget style 1 -->
              <div class="box box-widget widget-user-2">
                <div class="box-footer no-padding">
                  <ul class="nav nav-stacked">

                    <li class="">
                      <a href="qc/qc-imei/manage_qc.php">
                        <i class="text-red fa fa-clock-o"></i>
                        IMEI Pending QC

                        <span class="text-bold imei_pending_qc pull-right">
                          <i class="qc-loading fa fa-spinner fa-spin"></i>
                        </span>
                      </a>
                    </li>

                    <li class="">
                      <a href="qc/qc-serial/manage_qc.php">
                        <i class="text-red fa fa-clock-o"></i>
                        Serial Pending QC

                        <span class="text-bold serial_pending_qc pull-right">
                          <i class="qc-loading fa fa-spinner fa-spin"></i>
                        </span>
                      </a>
                    </li>

                    <li class="">
                      <a href="orders/imei/order_history.php">
                        <i class="text-red fa fa-exclamation-circle"></i>
                        IMEI Units Not Confirmed

                        <span class="text-bold pull-right">
                          <?php 
                          $fetch_imei_unit_confirmed = mysqli_query($conn,"select count(distinct order_id) as total from 
                          tbl_orders where unit_confirmed = 0");
                          $unit_confirmed = mysqli_fetch_assoc($fetch_imei_unit_confirmed);
                          echo $unit_confirmed['total'];
                        ?>
                        </span>
                      </a>
                    </li>

                    <li class="">
                      <a href="orders/serial/serial_order_history.php">
                        <i class="text-red fa fa-exclamation-circle"></i>
                        Serial Units Not Confirmed

                        <span class="text-bold pull-right">
                          <?php 
                          $fetch_serial_unit_confirmed = mysqli_query($conn,"select count(distinct order_id) as total from 
                          tbl_serial_orders where unit_confirmed = 0
                          ");
                          $serial_unit_confirmed = mysqli_fetch_assoc($fetch_serial_unit_confirmed);
                          echo $serial_unit_confirmed['total'];
                        ?>
                        </span>
                      </a>
                    </li>

                  </ul>
                </div>
              </div>
              <!-- /.widget-user -->
            </div>
          </div>
          <?php endif; ?>

          <div class="col-md-3">
            <!-- duplicate widgets -->
            <div class="duplicate-widgets">
              <!-- Widget: user widget style 1 -->
              <div class="box box-widget widget-user-2">
                <div class="box-footer no-padding">
                  <ul class="nav nav-stacked">

                    <li class="">
                      <a href="products/imei/manage_products.php?TRAY=Returns">
                        <i class="fa fa-mail-reply text-purple"></i>
                        <?php 
                          $fetch_total_imei_returns = mysqli_query($conn,"select count(distinct tbl_imei.item_imei) as total from tbl_purchases inner 
                          join tbl_imei on tbl_imei.item_imei = tbl_purchases.item_imei where 
                          tray_id='Returns' AND tbl_imei.status = 1");
                          $total_imei_returns = mysqli_fetch_assoc($fetch_total_imei_returns);
                        ?>
                        IMEI Returns

                        <span class="text-bold pull-right">
                          <?php echo $total_imei_returns['total'];?>
                        </span>
                      </a>
                    </li>

                    <li class="">
                      <a href="products/serial/manage_serial_products.php?TRAY=Returns">
                        <i class="fa fa-mail-reply text-purple"></i>
                        <?php 
                          $fetch_total_serial_returns = mysqli_query($conn,"select count(distinct pro.item_code) as total from 
                          tbl_serial_purchases as pr inner 
                          join tbl_serial_products as pro on pro.item_code = pr.item_code where 
                          pr.tray_id='Returns' AND pro.status = 1");
                          $total_serial_returns = mysqli_fetch_assoc($fetch_total_serial_returns);
                        ?>
                        Serial Returns

                        <span class="text-bold pull-right">
                          <?php echo $total_serial_returns['total'];?>
                        </span>
                      </a>
                    </li>


                  </ul>
                </div>
              </div>
              <!-- /.widget-user -->
            </div>
          </div>


        </div>
      </div>


      <!-- Main content -->
      <section class="content">
        <!-- Small boxes (Stat box) -->
        <div class="row">

          <!-- priority widget -->
          <div class="col-md-6">
            <?php include './dashboard/priority_imei_goodsin/priority_imei_purchases.php'; ?>
          </div>

          <!-- latest sales orders widget -->
          <div class="col-md-6">
            <div class="box">
              <div class="box-header">
                <h3 class="box-title pull-left">Recent Sales Orders</h3>
              </div>
              <div class="box-body">
                <table class="table table-striped table-hover" style="font-size:15px;">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Date</th>
                      <th>Customer</th>
                      <th>PO Ref</th>
                      <th>Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    <?php
                      $latest_sql = "SELECT 
                                        ord.order_id,
                                        MAX(ord.date) AS date,
                                        cst.name AS customer,
                                        cst.customer_id AS cust_id,
                                        MAX(ord.customer_ref) AS po_ref,
                                        COUNT(*) AS quantity
                                      FROM tbl_imei_sales_orders AS ord
                                      JOIN tbl_customers AS cst
                                        ON cst.customer_id = ord.customer_id
                                      WHERE ord.is_completed = '0'
                                        AND ord.date >= CURDATE() - INTERVAL 30 DAY
                                      GROUP BY ord.order_id, cst.name, cst.customer_id
                                      ORDER BY ord.order_id DESC
                                      LIMIT 10";
                      $latest_result = mysqli_query($conn, $latest_sql);
                      if ($latest_result && mysqli_num_rows($latest_result) > 0) {
                        while ($r = mysqli_fetch_assoc($latest_result)) {
                          $oid = (int)$r['order_id'];
                          $dt  = $r['date'];
                          $cust = htmlspecialchars($r['customer'] ?? '', ENT_QUOTES, 'UTF-8');
                          $custId = htmlspecialchars($r['cust_id'] ?? '', ENT_QUOTES, 'UTF-8');
                          $po   = htmlspecialchars($r['po_ref'] ?? '', ENT_QUOTES, 'UTF-8');
                          $qty  = (int)$r['quantity'];
                          echo '<tr>';
                          $href = 'orders/imei/new_order.php?sales_order=' . $oid . '&cust=' . rawurlencode($custId);
                          echo '<td><a href="' . $href . '">' . $oid . '</a></td>';
                          echo '<td>'. substr($dt, 0, 10) .'</td>';
                          echo '<td>'. $cust .'</td>';
                          echo '<td>'. $po .'</td>';
                          echo '<td>'. $qty .'</td>';
                          echo '</tr>';
                        }
                      } else {
                        echo '<tr><td colspan="5" class="text-center text-muted">No recent unprocessed orders</td></tr>';
                      }
                    ?>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>

        <!-- /.row -->


        <!-- /.control-sidebar -->
        <div class="control-sidebar-bg"></div>
      </section>
    </div>

    <footer class="main-footer">
    </footer>

    <div class="control-sidebar-bg"></div>
  </div>
  <!-- ./wrapper -->

  <!-- USER INACTIVE MARKUP -->
  <div class="user-inactive-wrapper">
    <div class="login-box">
      <div>
        <a style="display:block; text-align:center;" href="../../index2.html"><img
            src="../assets/uploads/<?php echo $fetch_logo_result['logo_image']; ?>"
            style="width:150px;margin:0 auto;"></a>
      </div>
      <!-- /.login-logo -->
      <div class="login-box-body">
        <p class="login-box-msg">Sign in as <?php echo $_SESSION['user_name']; ?></p>

        <form action="" method="post">
          <div class="form-group has-feedback">
            <input type="email" class="user_email form-control" placeholder="Email" required>
            <span class="glyphicon glyphicon-envelope form-control-feedback"></span>
          </div>
          <div class="form-group has-feedback">
            <input type="password" class="user_password form-control" placeholder="Password" required>
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

  <script src="assets/dist/bundle.js"></script>
  <script src="users/user-inactive-script.js" defer></script>

  <script>
  // $.widget.bridge('uibutton', $.ui.button);

  // User inactive state script ended
  function setInactiveError(message) {
    var errorEl = document.querySelector('.inactive-form-error');
    if (errorEl) {
      errorEl.textContent = message || '';
    }
  }

  var inactiveForm = document.querySelector('.user-inactive-wrapper form');
  var inactiveSubmitBtn = document.querySelector('.inactive_form_submit');
  if (inactiveForm) {
    inactiveForm.addEventListener('submit', function(e) {
      e.preventDefault();
      setInactiveError('');

      var userIdEl = document.querySelector('.user-id');
      var userId = userIdEl ? userIdEl.textContent.trim() : '';
      localStorage.setItem('userId', userId);

      var emailInput = document.querySelector('.user_email');
      var passwordInput = document.querySelector('.user_password');
      if (!emailInput || !passwordInput) {
        setInactiveError('Missing login fields. Please refresh and try again.');
        return;
      }

      if (inactiveSubmitBtn) {
        inactiveSubmitBtn.disabled = true;
      }

      $.ajax({
        type: "POST",
        url: "users/inactive_user_script.php",
        dataType: "json",
        data: {
          email: emailInput.value,
          password: passwordInput.value
        },
        success: function(data) {
          var response = data;
          if (typeof response === 'string') {
            try {
              response = JSON.parse(response);
            } catch (err) {
              response = null;
            }
          }

          if (!response) {
            setInactiveError('Unexpected response while signing in. Please try again.');
            return;
          }

          if (response.error) {
            setInactiveError(response.error);
            return;
          }

          var responseUserId = (response.user_id !== null && response.user_id !== undefined) ? String(response.user_id).trim() : '';
          if (!userId || !responseUserId) {
            setInactiveError('Sign in failed. Please try again.');
            return;
          }

          if (responseUserId !== userId) {
            setInactiveError('This session belongs to a different user. Please log out and sign in again.');
            return;
          }

          window.clearTimeout(timeoutID);
          localStorage.setItem('userInActive', '0');
          var wrapper = document.querySelector('.user-inactive-wrapper');
          if (wrapper) {
            wrapper.style.display = 'none';
          }
          location.href = window.location.href;
        },
        error: function() {
          setInactiveError('Unable to sign in right now. Please try again.');
        },
        complete: function() {
          if (inactiveSubmitBtn) {
            inactiveSubmitBtn.disabled = false;
          }
        }
      });
    });
  }

  $('.sidebar-toggle').on('click', function() {
    $('body').toggleClass('sidebar-open');
  })
  </script>
  <script src="dashboard/priority_imei_goodsin/priority_goodsin_script.js" defer></script>

  <!-- Pending QC request  -->
  <script src="dashboard/qc_stats/imei_qc_stats.js" defer></script>
  <script src="dashboard/qc_stats/serial_qc_stats.js" defer></script>
</body>

</html>
