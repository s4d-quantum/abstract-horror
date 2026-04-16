<?php //error_reporting(E_ALL & ~E_NOTICE); ?>
<?php include '../../db_config.php';  ?>
<?php include "../../authenticate.php" ?>
<?php $global_url="../../"; ?>
<?php 

$item_code = $_GET['item_code'];
$get_item_query = mysqli_query($conn,"select 
pr.id,
pr.item_brand,
pr.item_qty,
pr.title,

pu.product_id,
pu.purchase_id,
pu.date,
pu.tray_id

from tbl_accessories_products as pr 

inner join tbl_accessories_purchases as pu 
on pu.product_id = pr.id 

where 

pr.id=".$item_code);
  $get_item = mysqli_fetch_assoc($get_item_query);

?>
<?php include $global_url."header.php";?>

<!-- Content Wrapper. Contains page content -->
<div class="content-wrapper">
  <!-- Content Header (Page header) -->
  <section class="content-header">
    <h1>
      Item# <?php echo $item_code; ?>
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
                <P style="border:1px solid #eaeaea;padding:2px 3px;">
                  <?php
                    echo $get_item['purchase_id'];
                    ?>
                </P>
              </div>

              <div class="form-group col col-md-2 col-sm-6">
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

              <div class="form-group col col-md-3 col-sm-6">
                <label>Details</label>
                <P style="border:1px solid #eaeaea;padding:2px 3px;"><?php echo $get_item['title']; ?></P>
              </div>

              <div class="form-group col col-md-2 col-sm-6">
                <label>QTY</label>
                <P style="border:1px solid #eaeaea;padding:2px 3px;"><?php echo $get_item['item_qty']; ?></P>
              </div>

            </div>
            <!-- row ended -->

            <!-- ROW ENDED -->
          </div>
        </div>

        <div class="box box-success">
          <div class="box-body">

            <table class="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Ref</th>
                  <th>ITEM</th>
                  <th>Subject</th>
                  <th>Details</th>
                  <th>User</th>
                </tr>
              </thead>
              <tbody>
                <?php 
                  $fetch_item_logs = mysqli_query($conn,"select * from tbl_log 
                  where item_code=".$item_code." AND subject lIKE '%ACCESSORIES%' ORDER BY id DESC")                
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
                    <?php $get_product_title_query = mysqli_query($conn,"select title from 
                    tbl_accessories_products where id=".$row['item_code']);
                    $get_product_title = mysqli_fetch_assoc($get_product_title_query);
                    echo $get_product_title['title'];
                    ?>
                  </td>
                  <td>
                    <?php echo $row['subject'];?>
                  </td>
                  <td>
                    <?php echo $row['details'];?>
                  </td>
                  <td>
                    <?php 
                    // switch to s4d user accounts db 
                    mysqli_select_db($conn, 's4d_user_accounts');                    

                    $get_user_query = mysqli_query($conn,"select * from  
                    where 
                    user_id='".$row['user_id']."'");
                    $get_user = mysqli_fetch_assoc($get_user_query);
                    echo $get_user['user_name'];

                    // switch back to original db 
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
</body>

</html>