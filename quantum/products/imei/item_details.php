<?php //error_reporting(E_ALL & ~E_NOTICE); ?>
<?php include '../../db_config.php';  ?>
<?php include "../../authenticate.php" ?>
<?php $global_url="../../"; ?>
<?php 

// IMPORTANT_POINT::
// "ORDER BY pr.id DESC LIMIT 1"
// is used if i receive multiple rows i.e prev purchase or order row whihc was returned etc 
// so it will only pick latest record row 

$item_code = $_GET['item_code'];
$get_item_query = mysqli_query($conn,"select

distinct im.purchase_id,
im.item_gb,
im.item_color,
im.status,
im.item_grade,
im.oem_color,
im.goodsin_color,

pr.item_imei,
pr.tray_id,
pr.qc_required,
pr.qc_completed,
pr.purchase_return,


tac.item_brand,
tac.item_details


from tbl_imei as im

inner join tbl_tac as tac
on tac.item_tac = im.item_tac

inner join tbl_purchases as pr
on im.item_imei = pr.item_imei

where

pr.item_imei='".$item_code."'

ORDER BY pr.id DESC LIMIT 1
");
  $get_item = mysqli_fetch_assoc($get_item_query);

?>
<?php include $global_url."header.php";?>

<!-- Content Wrapper. Contains page content -->
<div class="content-wrapper">
  <!-- Content Header (Page header) -->
  <section class="content-header">
    <h1>
      Item# <span class="item_code"> <?php echo $item_code; ?> </span>
    </h1>
  </section>

  <!-- Main content -->
  <section class="content">

    <!-- row  -->
    <div class="row">
      <!-- col -->
      <div class="col-md-12">
        <!-- box started-->
        <div class="box box-success">
          <div class="box-body">

            <!-- ROW STARTED -->
            <div class="row">

              <div class="form-group col col-md-2 col-sm-6">
                <label>P.ID</label>
                <P class="pid" style="border:1px solid #eaeaea;padding:2px 3px;">
                  <?php echo $get_item['purchase_id'];?>
                </P>
                <p class="user_id hide"><?php echo $_SESSION['user_id']; ?></p>

              </div>

              <div class="form-group col col-md-3 col-sm-6">
                <label>Brand</label>
                <P style="border:1px solid #eaeaea;padding:2px 3px;">
                  <?php $get_modal_query = mysqli_query($conn,"select * from
                    tbl_categories where
                    category_id='".$get_item['item_brand']."'");
                    $get_modal = mysqli_fetch_assoc($get_modal_query);
                    echo $get_modal['title'];
                    ?>
                </P>
              </div>

              <div class="form-group col col-md-2 col-sm-6">
                <label>Color</label>
                <P style="border:1px solid #eaeaea;padding:2px 3px;">
                  <?php echo strlen($get_item['item_color'])<=0?'Null':$get_item['item_color']; ?></P>
              </div>

              <div class="form-group col col-md-2 col-sm-6">
                <label>OEM Color</label>
                <P style="border:1px solid #eaeaea;padding:2px 3px;">
                  <?php echo strlen($get_item['oem_color'])<=0?'Null':$get_item['oem_color']; ?></P>
              </div>

              <div class="form-group col-md-2 col-sm-6">
                <label>Goods In Color</label>
                <P style="border:1px solid #eaeaea;padding:2px 3px;">
                  <?php echo strlen($get_item['goodsin_color'])<=0?'Null':$get_item['goodsin_color']; ?></P>
              </div>

              <div class="form-group col-md-4 col-sm-6">
                <label>Details</label>
                <P style="border:1px solid #eaeaea;padding:2px 3px;"><?php echo $get_item['item_details']; ?></P>
              </div>

            </div>
            <!-- row ended -->

            <div class="row">
              <div class="form-group col col-md-2 col-sm-6">
                <label>Grade</label>
                <?php $get_grade_query = mysqli_query($conn,"select title from
                    tbl_grades where
                    grade_id=".$get_item['item_grade']);
                    $get_grade = mysqli_fetch_assoc($get_grade_query);
                    ?>
                <P style="border:1px solid #eaeaea;padding:2px 3px;">
                  <?php echo strlen($get_grade['title'])<=0?'Null':$get_grade['title']; ?></P>
              </div>

              <div class="form-group col col-md-4 col-sm-6">
                <label>Customer</label>
                <?php $get_customer_query = mysqli_query($conn,"select cst.name from
                    tbl_orders as ord
                    inner join tbl_customers as cst on
                    ord.customer_id = cst.customer_id
                    where ord.item_imei='".$item_code."' AND
                    ord.order_return = 0");
                    $get_customer = mysqli_fetch_assoc($get_customer_query);
                    ?>
                <P style="border:1px solid #eaeaea;padding:2px 3px;">
                  <?php echo strlen($get_customer['name'])<=0?'Null':$get_customer['name']; ?></P>
              </div>

              <div class="form-group col-md-2 col-sm-6">
                <label>Status</label>
                <P style="border:1px solid #eaeaea;padding:2px 3px;">
                  <?php echo $get_item['status'] == 1?'In Stock':'Out of Stock'; ?></P>
              </div>

              <div class="form-group col col-md-3 col-sm-6 show-tray-container">
                <label>Tray#</label>
                <div class="input-group choose-tray-container">
                  <select class="form-control tray-control">
                    <?php
                        $get_tray_query = mysqli_query($conn,"select title, tray_id from
                        tbl_trays");
                        while($get_tray = mysqli_fetch_assoc($get_tray_query)):
                      ?>

                    <option value="<?php echo $get_tray['tray_id']; ?>"
                      <?php echo $get_tray['tray_id'] === $get_item['tray_id'] ? 'selected':''?>>
                      <?php
                          echo $get_tray['title'];
                        ?>
                    </option>
                    <?php endwhile; ?>
                  </select>
                  <span class="input-group-btn">
                    <button type="button" class="btn btn-success btn-flat confirm-tray">
                      <i class="fa fa-check "></i></button>
                  </span>
                </div>

              </div>

            </div>
            <!-- Row ended  -->

            <div class="row">

              <div class="form-group col col-md-2 col-sm-6">
                <label>In Sales Order</label>
                <P style="border:1px solid #eaeaea;padding:2px 3px;">
                  <?php
                    $sales_order_item = mysqli_query($conn,"select

                    count(item_code),
                    order_id from
                    tbl_imei_sales_orders
                    where item_code = '".$get_item['item_imei']."' AND
                    is_completed = 0")
                     or die('Error: '.mysqli_error($conn));
                    $in_sales_order = mysqli_fetch_assoc($sales_order_item);
                    echo $in_sales_order['count(item_code)'] == 0 ? 'No':$in_sales_order['order_id'];
                    ?>
                </P>
              </div>


              <div class="form-group col col-md-2 col-sm-6">
                <label>QC Required?</label>
                <P style="border:1px solid #eaeaea;padding:2px 3px;">
                  <?php echo $get_item['qc_required'] == 1? 'Yes':'No'; ?></P>
              </div>

              <div class="form-group col col-md-2 col-sm-6">
                <label>QC Status</label>
                <?php
                    $get_qc = mysqli_query($conn,"select

                    item_comments,
                    item_cosmetic_passed,
                    item_functional_passed ,
                    item_flashed

                    from tbl_qc_imei_products
                    where item_code = '".$get_item['item_imei']."' AND
                    purchase_id=".$get_item['purchase_id'])
                     or die('Error: '.mysqli_error($conn));
                    $qc = mysqli_fetch_assoc($get_qc);
                  ?>
                <p>
                  <?php if($get_item['qc_required']==1):?>
                  <label class="label label-primary">
                    <?php
                      echo
                      //done
                      $qc['item_cosmetic_passed'] == 1 &&
                      $qc['item_functional_passed'] == 1 &&
                      $get_item['qc_completed'] == 1? 'Done':
                      //failed
                      ($qc['item_cosmetic_passed'] == 0 ||
                      $qc['item_functional_passed'] == 0 &&
                      $get_item['qc_completed'] == 1? 'Failed':'In Progress');
                      ?>
                  </label>
                  <?php endif; ?>
                </p>
              </div>

              <div class="form-group col col-md-4 col-sm-6">
                <label>QC Comments</label>
                <P style="border:1px solid #eaeaea;padding:2px 3px;">
                  <?php echo strlen($qc['item_comments'])<=0?'none':$qc['item_comments']; ?></P>
              </div>

              <div class="form-group col-md-1 col-sm-6">
                <br>
                <?php if($get_item['qc_required']==1){?>
                <a href="../../qc/qc-imei/edit_qc.php?pur_id=<?php echo $get_item['purchase_id']; ?>"
                  class="btn btn-info">
                  <i class="fa fa-search"></i> visit QC
                </a>
                <?php }?>
              </div>

            </div>
          </div>
        </div>

        <!-- IMEI Data Table -->
        <?php
        // Get IMEI data from the separate database
        $imei_data = null;
        if($get_item) {
            $imei1 = $get_item['item_imei'];
            // Use the same connection parameters as the main database
            $imei_conn = new mysqli($host, $username, $password, 'imei24_db');
            if ($imei_conn->connect_error) {
                die("Connection failed: " . $imei_conn->connect_error);
            }
            $imei_data_query = mysqli_query($imei_conn, "SELECT * FROM imei_data WHERE imei_1 = '$imei1'");
            $imei_data = mysqli_fetch_assoc($imei_data_query);
            $imei_conn->close();
        }
        ?>
        <?php if($imei_data): ?>
        <div class="box box-info">
          <div class="box-header with-border">
            <h3 class="box-title">IMEI Data Information</h3>
          </div>
          <div class="box-body">
            <div class="table-responsive">
              <table class="table table-bordered">
                <tbody>
                  <tr>
                    <th>IMEI 1</th>
                    <td><?php echo $imei_data['imei_1']; ?></td>
                    <th>IMEI 2</th>
                    <td><?php echo $imei_data['imei_2'] ? $imei_data['imei_2'] : 'N/A'; ?></td>
                  </tr>
                  <tr>
                    <th>Serial Number</th>
                    <td><?php echo $imei_data['serial_number'] ? $imei_data['serial_number'] : 'N/A'; ?></td>
                    <th>Model Info</th>
                    <td><?php echo $imei_data['model_info'] ? $imei_data['model_info'] : 'N/A'; ?></td>
                  </tr>
                  <tr>
                    <th>Model Name</th>
                    <td><?php echo $imei_data['model_name'] ? $imei_data['model_name'] : 'N/A'; ?></td>
                    <th>Model Number</th>
                    <td><?php echo $imei_data['model_number'] ? $imei_data['model_number'] : 'N/A'; ?></td>
                  </tr>
                  <tr>
                    <th>Color</th>
                    <td><?php echo $imei_data['color'] ? $imei_data['color'] : 'N/A'; ?></td>
                    <th>Warranty Status</th>
                    <td><?php echo $imei_data['warranty_status'] ? $imei_data['warranty_status'] : 'N/A'; ?></td>
                  </tr>
                  <tr>
                    <th>Production Location</th>
                    <td><?php echo $imei_data['production_location'] ? $imei_data['production_location'] : 'N/A'; ?></td>
                    <th>Production Date</th>
                    <td><?php echo $imei_data['production_date'] ? $imei_data['production_date'] : 'N/A'; ?></td>
                  </tr>
                  <tr>
                    <th>Country & Carrier</th>
                    <td colspan="3"><?php echo $imei_data['country_and_carrier'] ? $imei_data['country_and_carrier'] : 'N/A'; ?></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        <?php endif; ?>



        <div class="box box-success">
          <div class="box-body">

            <table class="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Ref</th>
                  <th>IMEI#</th>
                  <th>Subject</th>
                  <th>Details</th>
                  <th>User</th>
                </tr>
              </thead>
              <tbody>
                <?php
                  $fetch_item_logs = mysqli_query($conn,"select * from tbl_log
                  where item_code='".$item_code."' ORDER BY id DESC")
                  or die('Error: '.mysqli_error($conn));
                  while($row = mysqli_fetch_assoc($fetch_item_logs)):
                ?>
                <tr>
                  <td>
                    <?php echo $row['date'];?>
                  </td>
                  <td>
                    <?php echo !empty($row['auto_time']) ? date('H:i:s', strtotime($row['auto_time'])) : '';?>
                  </td>
                  <td>
                    <?php echo $row['ref'];?>
                  </td>
                  <td>
                    <?php echo $row['item_code'];?>
                  </td>
                  <td>
                    <?php echo $row['subject'];?>
                  </td>
                  <td>
                    <?php echo $row['details'];?>
                  </td>
                  <td>
                    <?php
                    
                    mysqli_select_db($conn, 's4d_user_accounts');

                    $get_user_query = mysqli_query($conn,"select * from tbl_accounts
                    where
                    user_id='".$row['user_id']."'");
                    $get_user = mysqli_fetch_assoc($get_user_query);
                    echo $get_user['user_name'];

                    mysqli_select_db($conn, $_SESSION['user_db']);
                    ?>
                  </td>
                </tr>
                <?php endwhile; ?>
              </tbody>
            </table>


          </div>
          <!-- /.box-body -->
        </div>
        <!-- /.box -->
      </div>
      <!-- col -->
    </div>
    <!-- row -->
  </section>
</div>




<?php include $global_url."footer.php";?>
<script>
let confirmTrayBtn = document.querySelector('.confirm-tray'),
  userId = document.querySelector('.user_id').innerHTML.trim(),
  purchaseId = document.querySelector('.pid').innerHTML.trim(),
  itemCode = document.querySelector('.item_code').innerHTML.trim();

confirmTrayBtn.addEventListener('click', function(e) {
  e.preventDefault();
  let trayId = document.querySelector('.tray-control').value.trim();
  $.ajax({
    'type': "POST",
    'url': "includes/update_tray.php",
    'data': {
      item_code: itemCode,
      purchase_id: purchaseId,
      tray_id: trayId,
      user_id: userId
    },
    'success': (data) => {
      $.notify("Tray updated", {
        className: "success",
        showDuration: 100,
      });
    },
    'error': (data) => {
      $.notify("Error!!", {
        className: "error",
        showDuration: 100,
      });
    }
  });


})
</script>
</body>

</html>
