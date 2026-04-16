<?php include '../db_config.php';  ?>
<?php $global_url="../"; ?>
<?php include "../authenticate.php" ?>

<?php include "../header.php";
?>
<?php 

// 0-30 days 
$from_date30 = date("Y-m-d", strtotime( date( "Y-m-d", strtotime( date("Y-m-d") ) ) . "-1 month" ));

// 30-60 days 
$from_date60 =  date("Y-m-d", strtotime( date( "Y-m-d", strtotime( date("Y-m-d") ) ) . "-2 month" ));
$to_date60 =  date("Y-m-d", strtotime( date( "Y-m-d", strtotime( date("Y-m-d") ) ) . "-1 month -1 day" ));

// 60-90 days 
$from_date90 =  date("Y-m-d", strtotime( date( "Y-m-d", strtotime( date("Y-m-d") ) ) . "-3 month" ));
$to_date90 =  date("Y-m-d", strtotime( date( "Y-m-d", strtotime( date("Y-m-d") ) ) . "-2 month -1 day" ));

// over 90 days 
$before_date90 =  date("Y-m-d", strtotime( date( "Y-m-d", strtotime( date("Y-m-d") ) ) . "-3 month -1 day" ));


?>


  <!-- Content Wrapper. Contains page content -->
  <div class="content-wrapper">
    <!-- Content Header (Page header) -->
    <section class="content-header">
      <h1>
        Manage Aged Stocks 
      </h1>
    </section>

    <!-- Main content -->
    <section class="content">
      <div class="row">

      <!-- Main content -->
        <div class="col-xs-12">
          <section class="content">
            <div class="row">
              <div class="box">
                <div class="box-header">
                  <h3 class="box-title">IMEI Stock </h3>
                </div>
                <div class="box-body">
                
                  <div class="col col-md-4 col-xs-12 col-sm-6">
                    <a href="../products/imei/manage_products.php?FROMDATE=<?php echo $from_date30; ?>">
                      <button type="button" class="btn btn-block btn-lg bg-success text-black">
                        0 - 30 <small>days</small> 
                        <span class="imei_0_30_value badge bg-green">
                          <i class="fa fa-spin fa-spinner"></i>
                        </span></button>
                    </a>
                  </div>
                  <div class="col col-md-4 col-xs-12 col-sm-6">
                    <a href="../products/imei/manage_products.php?FROMDATE=<?php echo $from_date60; ?>&TODATE=<?php echo $to_date60; ?>">
                      <button type="button" class="btn btn-block btn-lg bg-success text-black">
                        30 - 60 <small>days</small> 
                        <span class="imei_30_60_value badge bg-green">
                          <i class="fa fa-spin fa-spinner"></i>
                        </span></button>
                      </button>
                    </a>
                  </div>
                  <div class="col col-md-4 col-xs-12 col-sm-6">
                    <a href="../products/imei/manage_products.php?FROMDATE=<?php echo $from_date90; ?>&TODATE=<?php echo $to_date90; ?>">
                      <button type="button" class="btn btn-block btn-lg bg-success text-black">
                        60 - 90 <small>days</small> 
                        <span class="imei_60_90_value badge bg-green">
                          <i class="fa fa-spin fa-spinner"></i>
                        </span></button>
                      </button>
                    </a>
                  </div>
                  <div class="col col-md-4 col-xs-12 col-sm-6">
                    </br>
                    <a href="../products/imei/manage_products.php?TODATE=<?php echo $before_date90; ?>">
                      <button type="button" class="btn btn-block btn-lg bg-success text-black">
                        Over   90 <small>days</small> 
                        <span class="imei_90_value badge bg-green">
                          <i class="fa fa-spin fa-spinner"></i>
                        </span></button>
                      </button>
                    </a>
                  </div>

                </div>
                <!-- /.box-body -->
              </div>
              <!-- /.box -->

              <div class="box">
                <div class="box-header">
                  <h3 class="box-title">Serial Stock</h3>
                </div>
                <div class="box-body">
                
                  <div class="col col-md-4 col-xs-12 col-sm-6">
                    <a href="../products/serial/manage_serial_products.php?FROMDATE=<?php echo $from_date30; ?>">
                      <button type="button" class="btn btn-block btn-lg bg-success text-black">
                        0 - 30 <small>days</small> 
                        <span class="serial_0_30_value badge bg-green">
                          <i class="fa fa-spin fa-spinner"></i>
                        </span>
                      </button>
                    </a>
                  </div>
                  <div class="col col-md-4 col-xs-12 col-sm-6">
                    <a href="../products/serial/manage_serial_products.php?FROMDATE=<?php echo $from_date60; ?>&TODATE=<?php echo $to_date60; ?>">
                      <button type="button" class="btn btn-block btn-lg bg-success text-black">
                        30 - 60 <small>days</small> 
                        <span class="serial_30_60_value badge bg-green">
                          <i class="fa fa-spin fa-spinner"></i>
                        </span>
                      </button>
                    </a>
                  </div>
                  <div class="col col-md-4 col-xs-12 col-sm-6">
                    <a href="../products/serial/manage_serial_products.php?FROMDATE=<?php echo $from_date90; ?>&TODATE=<?php echo $to_date90; ?>">
                      <button type="button" class="btn btn-block btn-lg bg-success text-black">
                        60 - 90<small>days</small> 
                        <span class="serial_60_90_value badge bg-green">
                          <i class="fa fa-spin fa-spinner"></i>
                        </span>
                      </button>
                    </a>
                  </div>
                  <div class="col col-md-4 col-xs-12 col-sm-6">
                    </br>
                    <a href="../products/serial/manage_serial_products.php?TODATE=<?php echo $before_date90; ?>">
                      <button type="button" class="btn btn-block btn-lg bg-success text-black">
                        Over 90 <small>days</small> 
                        <span class="serial_90_value badge bg-green">
                          <i class="fa fa-spin fa-spinner"></i>
                        </span>
                      </button>
                    </a>
                  </div>

                </div>
                <!-- /.box-body -->
              </div>
              <!-- /.box -->

            </div>
          </section>
        </div> <!-- col -->

      </div>
      <!-- /.row -->
    </section>
    <!-- /.content -->
  </div>
  <!-- /.content-wrapper -->


  <!-- IMEI aged stock  -->
  <!-- 0-30 -->
  <p class="imei_0_30_from"><?php echo $from_date30; ?></p>

  <!-- 30_60 -->
  <p class="imei_30_60_from"><?php echo $from_date60; ?></p>
  <p class="imei_30_60_to"><?php echo $to_date60; ?></p>

  <!-- 60_90 -->
  <p class="imei_60_90_from"><?php echo $from_date90; ?></p>
  <p class="imei_60_90_to"><?php echo $to_date90; ?></p>

  <!-- 90+ -->
  <p class="imei_90_to"><?php echo $to_date90; ?></p>

  <!-- /IMEI aged stock  -->

  <!-- SERIAL aged stock  -->
  <!-- 0-30 -->
  <p class="serial_0_30_from"><?php echo $from_date30; ?></p>

  <!-- 30_60 -->
  <p class="serial_30_60_from"><?php echo $from_date60; ?></p>
  <p class="serial_30_60_to"><?php echo $to_date60; ?></p>

  <!-- 60_90 -->
  <p class="serial_60_90_from"><?php echo $from_date90; ?></p>
  <p class="serial_60_90_to"><?php echo $to_date90; ?></p>

  <!-- 90+ -->
  <p class="serial_90_to"><?php echo $to_date90; ?></p>

  <!-- /SERIAL aged stock  -->


<?php include $global_url."footer.php";?>
<script src="./imei/fetch_imei_stock.js"></script>
<script src="./serial/fetch_serial_stock.js"></script>
<script>

(async function(){

  let defaultParams = {
      customer:null,
      supplier:null,
      category:null,
      color:null,
      gb:null,
      grade:null,
      tray:null,
      fromDate:null,
      toDate:null,
      stockType:'instock',
      filterStatus:null,
      searchIMEI:null,
      searchMODEL:null
    };

    // getting values  
    let imei_0_30_from = document.querySelector('.imei_0_30_from').innerHTML.trim();

    let imei_30_60_from = document.querySelector('.imei_30_60_from').innerHTML.trim();
    let imei_30_60_to = document.querySelector('.imei_30_60_to').innerHTML.trim();

    let imei_60_90_from = document.querySelector('.imei_60_90_from').innerHTML.trim();
    let imei_60_90_to = document.querySelector('.imei_60_90_to').innerHTML.trim();

    let imei_90_to = document.querySelector('.imei_90_to').innerHTML.trim();

    // using promise 
    // update value for 0-30
    let result_imei_0_30 = await fetchIMEIData({...defaultParams, fromDate:imei_0_30_from});
    document.querySelector('.imei_0_30_value').innerHTML = JSON.parse(result_imei_0_30).data.length;

    // update value for 30-60
    let result_imei_30_60 = await fetchIMEIData({
      ...defaultParams, 
      fromDate:imei_30_60_from, 
      toDate:imei_30_60_to
    });
    document.querySelector('.imei_30_60_value').innerHTML = JSON.parse(result_imei_30_60).data.length;
    
    // update value for 60-90
    let result_imei_60_90 = await fetchIMEIData({
      ...defaultParams, 
      fromDate:imei_60_90_from, 
      toDate:imei_60_90_to
    });
    document.querySelector('.imei_60_90_value').innerHTML = JSON.parse(result_imei_60_90).data.length;
    
    let result_imei_90 = await fetchIMEIData({...defaultParams, toDate:imei_90_to});
    document.querySelector('.imei_90_value').innerHTML = JSON.parse(result_imei_90).data.length;

    // fetchIMEIData({...defaultParams, fromData:imei_90_to});  
    // or could be 
    // let result_imei_0_30 = await fetchIMEIData();

  })();

  // SERIAL AGED STOCK COUNTS  
(async function(){

    let defaultParams = {
      customer:null,
      supplier:null,
      category:null,
      grade:null,
      tray:null,
      fromDate:null,
      toDate:null,
      stockType:'instock',
      filterStatus:null,
      searchIMEI:null,
      searchMODEL:null
    };

    // getting values  
    let serial_0_30_from = document.querySelector('.serial_0_30_from').innerHTML.trim();

    let serial_30_60_from = document.querySelector('.serial_30_60_from').innerHTML.trim();
    let serial_30_60_to = document.querySelector('.serial_30_60_to').innerHTML.trim();

    let serial_60_90_from = document.querySelector('.serial_60_90_from').innerHTML.trim();
    let serial_60_90_to = document.querySelector('.serial_60_90_to').innerHTML.trim();

    let serial_90_to = document.querySelector('.serial_90_to').innerHTML.trim();

    // using promise 
    // update value for 0-30
    let result_serial_0_30 = await fetchSerialData({...defaultParams, fromDate:serial_0_30_from});
    document.querySelector('.serial_0_30_value').innerHTML = JSON.parse(result_serial_0_30).data.length;

    // update value for 30-60
    let result_serial_30_60 = await fetchSerialData({
      ...defaultParams, 
      fromDate:serial_30_60_from, 
      toDate:serial_30_60_to
    });
    document.querySelector('.serial_30_60_value').innerHTML = JSON.parse(result_serial_30_60).data.length;
    
    // update value for 60-90
    let result_serial_60_90 = await fetchSerialData({
      ...defaultParams, 
      fromDate:serial_60_90_from, 
      toDate:serial_60_90_to
    });
    document.querySelector('.serial_60_90_value').innerHTML = JSON.parse(result_serial_60_90).data.length;
    
    let result_serial_90 = await fetchSerialData({...defaultParams, toDate:serial_90_to});
    document.querySelector('.serial_90_value').innerHTML = JSON.parse(result_serial_90).data.length;

    // fetchSerialData({...defaultParams, fromData:imei_90_to});  
    // or could be 
    // let result_imei_0_30 = await fetchSerialData();

  })();

</script>
</body>
</html>



