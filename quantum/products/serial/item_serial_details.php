<?php //error_reporting(E_ALL & ~E_NOTICE); ?>
<?php include '../../db_config.php';  ?>
<?php include "../../authenticate.php" ?>
<?php $global_url="../../"; ?>
<?php 

$item_code = $_GET['item_code'];
$get_item_query = mysqli_query($conn,"select 
  distinct item.purchase_id,
  item.item_details,
  item.status,
  item.item_brand,
  item.item_grade,

  pr.item_code,
  pr.tray_id,
  pr.qc_required,
  pr.qc_completed,
  pr.purchase_return

  from tbl_serial_products as item

  inner join tbl_serial_purchases as pr 
  on item.item_code = pr.item_code 

  where 
  pr.item_code='".$item_code."' 

  ORDER BY pr.id DESC LIMIT 1");
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
                  <?php $get_pid_query = mysqli_query($conn,"select 
                    purchase_id from 
                    tbl_serial_purchases where purchase_return = 0 and 
                    item_code='".$item_code."'");
                    $get_pid = mysqli_fetch_assoc($get_pid_query)['purchase_id'];
                    echo $get_pid;
                    ?>
                </P>
                <p class="user_id hide"><?php echo $_SESSION['user_id']; ?></p>
              </div>

              <div class="form-group col col-md-2 col-sm-6">
                <label>Brand</label>
                <P style="border:1px solid #eaeaea;padding:2px 3px;">
                  <?php 
                    if(isset($get_item['item_brand'])){
                      $get_modal_query = mysqli_query($conn,"select * from 
                      tbl_categories where 
                      category_id='".$get_item['item_brand']."'");
                      $get_modal = mysqli_fetch_assoc($get_modal_query);
                      echo $get_modal['title'];
                    }
                    else{
                      echo 'Null';
                    }
                    ?>
                </P>
              </div>

              <div class="form-group col col-md-4 col-sm-6">
                <label>Details</label>
                <P style="border:1px solid #eaeaea;padding:2px 3px;">
                  <?php 
                    if(isset($get_item['item_details'])){
                      echo $get_item['item_details']; 
                    }
                    else{
                      echo "Null";
                    }
                    ?>
                </P>
              </div>

              <div class="form-group col col-md-2 col-sm-6">
                <label>Status</label>
                <P style="border:1px solid #eaeaea;padding:2px 3px;">
                  <?php 
                    if(isset($get_item['status'])){
                      echo $get_item['status'] == 1?'In Stock':'Out of Stock'; 
                    }
                    else{
                      echo 'Null';
                    }
                    ?>
                </P>
              </div>

            </div>
            <!-- row ended -->

            <div class="row">
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

              <div class="row">
                <div class="form-group col col-md-2 col-sm-6">
                  <label>Grade</label>
                  <P style="border:1px solid #eaeaea;padding:2px 3px;">
                    <?php 
                    if($get_item['item_grade'] > 0){
                      $get_modal_query = mysqli_query($conn,"select title from 
                      tbl_grades where 
                      grade_id='".$get_item['item_grade']."'");
                      $get_modal = mysqli_fetch_assoc($get_modal_query);
                      echo $get_modal['title'];
                    }
                    else{
                      echo 'Null';
                    }
                    ?>
                  </P>
                </div>

                <div class="form-group col col-md-3 col-sm-6">
                  <label>Customer</label>
                  <?php $get_customer_query = mysqli_query($conn,"select cst.name from 
                    tbl_serial_orders as ord 
                    inner join tbl_customers as cst on 
                    ord.customer_id = cst.customer_id 
                    where ord.item_code='".$item_code."' AND 
                    ord.order_return = 0");
                    $get_customer = mysqli_fetch_assoc($get_customer_query);
                    ?>
                  <P style="border:1px solid #eaeaea;padding:2px 3px;">
                    <?php echo strlen($get_customer['name'])<=0?'Null':$get_customer['name']; ?></P>
                </div>

                <div class="form-group col col-md-2 col-sm-6">
                  <label>In Sales Order</label>
                  <P style="border:1px solid #eaeaea;padding:2px 3px;">
                    <?php 
                    $sales_order_item = mysqli_query($conn,"select 

                    count(item_code),
                    order_id from 
                    tbl_serial_sales_orders 
                    where item_code = '".$get_item['item_code']."' AND 
                    is_completed = 0")
                     or die('Error: '.mysqli_error($conn));
                    $in_sales_order = mysqli_fetch_assoc($sales_order_item);
                    echo $in_sales_order['count(item_code)'] == 0 ? 'No':$in_sales_order['order_id'];
                    ?>
                  </P>
                </div>

              </div>
            </div>
            <!-- ROW ENDED -->

            <div class="row">

              <div class="form-group col col-md-2 col-sm-6">
                <label>QC Required?</label>
                <P style="border:1px solid #eaeaea;padding:2px 3px;">
                  <?php echo $get_item['qc_required'] == 1? 'Yes':'No'; ?></P>
              </div>

              <div class="form-group col col-md-2 col-sm-6">
                <label>QC Status</label>
                <br />
                <?php 
                    $get_qc = mysqli_query($conn,"select 

                    item_comments,
                    item_cosmetic_passed, 
                    item_functional_passed ,
                    item_flashed

                    from tbl_qc_serial_products
                    where item_code = '".$get_item['item_code']."' AND 
                    purchase_id=".$get_item['purchase_id'])
                     or die('Error: '.mysqli_error($conn));
                    $qc = mysqli_fetch_assoc($get_qc);
                  ?>
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
              </div>

              <div class="form-group col col-md-4 col-sm-6">
                <label>QC Comments</label>
                <P style="border:1px solid #eaeaea;padding:2px 3px;">
                  <?php echo strlen($qc['item_comments'])<=0?'none':$qc['item_comments']; ?></P>
              </div>

              <div class="form-group col col-md-3 col-sm-6">
                <br>
                <?php if($get_item['qc_required']==1){?>
                <a href="../../qc/qc-serial/edit_qc.php?pur_id=<?php echo $get_item['purchase_id']; ?>"
                  class="btn btn-info">
                  <i class="fa fa-search"></i> visit QC
                </a>
                <?php }?>
              </div>
            </div>
            <!-- Row ended  -->

          </div>
        </div>

        <div class="box box-success">
          <div class="box-body">

            <table class="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Ref</th>
                  <th>Item code#</th>
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