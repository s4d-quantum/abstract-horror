<?php error_reporting(E_ALL & ~E_NOTICE); ?>
<?php include '../db_config.php';  ?>
<?php include "../../authenticate.php" ?>
<?php $global_url="../"; ?>
<?php 

$cur_date=date('Y-m-d');
if(isset($_POST['submit_report'])){
  $from_date = str_replace("/", "-", $_POST['from_date']);
  $to_date = str_replace("/", "-", $_POST['to_date']);
}

?>

<?php include "../header.php";
?>

  <!-- Content Wrapper. Contains page content -->
  <div class="content-wrapper">
    <!-- Content Header (Page header) -->
      <section class="content-header">
      <h1>
        Non IMEI Purchases Report
      </h1>
    </section>

    <!-- Main content -->
    <section class="content">

      <!-- form started -->
      <form action="<?php echo $_SERVER["PHP_SELF"];?>" method="post">

      <!-- row  -->
      <div class="row">
      <!-- col -->
        <div class="col-md-12">
        <!-- box started-->
          <div class="box box-success">
            <div class="box-body">

              <div class="row"> 
                <div class="col col-md-4">
                  <div class="form-group">
                    <label>From:</label>
                    <div class="input-group date">
                      <div class="input-group-addon">
                        <i class="fa fa-calendar"></i>
                      </div>
                      <input type="text" class="form-control pull-right" id="datepicker1" name="from_date" required="" value="<?php echo $cur_date; ?>">
                    </div>
                    <!-- /.input group -->
                    </div>
                </div>
                <div class="col col-md-4">
                  <div class="form-group">
                    <label>To:</label>
                    <div class="input-group date">
                      <div class="input-group-addon">
                        <i class="fa fa-calendar"></i>
                      </div>
                      <input type="text" class="form-control pull-right" id="datepicker2" name="to_date" required="" value="<?php echo $cur_date; ?>">
                    </div>
                    <!-- /.input group -->
                    </div>
                </div>
                <div class="col col-md-4">
                    <br>
                  <input type="submit" name="submit_report" value="View Report" class="btn btn-success">
                </div>
              </div>


            </div>
            <!-- /.box-body -->
          </div>
          <!-- /.box -->
        </div>
        <!-- col -->

      </div>
      <!-- row -->

    </form>

    <?php if($_POST['submit_report']):?> 
    <div class="box box-success">
      <div class="box-body">

        <h3>Purchases from: <b><?php echo $from_date; ?></b> to <b><?php echo $to_date; ?></b></h3>

        <!-- Date --> 
        <?php 
          $interval = new DateInterval('P1D');
          $begin_date = new DateTime($from_date);
          $last_date = new DateTime($to_date);

          $dateRange = new DatePeriod($begin_date,$interval,$last_date); 
          $dates = array();
          foreach ( $dateRange as $dt ){
            $dates[] = $dt->format( "Y-m-d" );  
          }
        ?>
        <!-- /Date -->

        <table class="table table-bordered">
          <thead>
            <th>P.ID</th>
            <th>Item Code</th>
            <th>Brand</th>
            <th>Qty</th>
            <th>Details</th>
          </thead>
          <tbody>
            <?php
              $total = 0;
              // dates for each started
              foreach($dates as $date):
            ?>  
            <tr>
                <td colspan="6" class="text-center bg-blue"><b><?php echo $date;?></b></td>
            </tr>
            <?php $get_date_purchases = mysqli_query($conn,"select distinct purchase_id,
            supplier_id,date  from tbl_non_imei_purchases where date='".$date."'")
              or die('Error:: ' . mysqli_error($conn));
             ?>
            <?php while($row = mysqli_fetch_assoc($get_date_purchases)): ?>
            
            <?php $get_purchase_items_query = mysqli_query($conn,"select 
            im.item_code,
            im.item_details,
            im.item_brand,
            im.item_qty
            from
            tbl_non_imei_products as im 
            inner join 
            tbl_non_imei_purchases as pr on 
            pr.item_code = im.item_code where 
            pr.purchase_id ='".$row['purchase_id']."'")
              or die('Error:: ' . mysqli_error($conn));
              
             ?>
            <?php while($row_data = mysqli_fetch_assoc($get_purchase_items_query)): ?>
            <tr>
              <td><b><?php echo $row['purchase_id']; ?></b></td>
              <td><b><?php echo $row_data['item_code']; ?></b></td>
              <td>
                <?php $get_modal_query = mysqli_query($conn,"select * from tbl_categories where 
                category_id='".$row_data['item_brand']."'") ?>
                <?php $get_modal = mysqli_fetch_assoc($get_modal_query); ?>
                <?php echo $get_modal['title']; ?>
              </td>
              <td><?php echo $row_data['item_qty']; ?></td>
              <td><?php echo $row_data['item_details']; ?></td>
            </tr>
            <?php $total++; ?>
            <?php endwhile; ?>
            <?php endwhile; ?>
            <?php endforeach; ?>
            <!-- <tr>
              <td colspan="4" class="text-right">
                <b>Total:</b>
              </td>
              <td>
                <?php //echo $total;?>              
              </td>
            </tr> -->
          </tbody>
        </table>
        <br>
        <hr>
        <br>
      <?php endif; ?>
      </div>
    </div>

    <!-- form ended -->
    </section>
    </div>



 
<!-- jQuery 2.2.3 -->
<?php include $global_url."footer.php";?>

<script type="text/javascript">
    //Date picker
    $('#datepicker1').datepicker({
      autoclose: true,
      format:'yyyy/mm/dd'
    });
    $('#datepicker2').datepicker({
      autoclose: true,
      format:'yyyy/mm/dd'
    });

  </script>

</body>
</html>