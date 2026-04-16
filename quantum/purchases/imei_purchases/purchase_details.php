<?php error_reporting(E_ALL & ~E_NOTICE); ?>
<?php include '../../db_config.php';  ?>
<?php include "../../authenticate.php" ?>
<?php $global_url="../../"; ?>
<?php 

  // fetch logo 
  $fetch_logo_query = mysqli_query($conn,"Select * from tbl_settings");
  $fetch_logo_result = mysqli_fetch_assoc($fetch_logo_query);

  // get purchase details
  $purchase_id = $_GET['pur_id'];
  $query = mysqli_query($conn,"select * from tbl_purchases where 
    tbl_purchases.purchase_id='".$purchase_id."'")
    or die('error: '.mysqli_error($conn));
  $get_purchase_details = mysqli_fetch_assoc($query);

  // get product details
  $get_products_query = mysqli_query($conn,"select 
    DISTINCT im.item_imei,
    im.item_tac,
    im.item_gb,
    im.item_grade,
    im.item_color,
    tc.item_brand,
    tc.item_details,
    pur.purchase_id
    from tbl_imei as im 

    inner join 
    tbl_tac as tc on 
    tc.item_tac = im.item_tac 

    inner join 
    tbl_purchases as pur on 
    pur.item_imei = im.item_imei 

    where 
    pur.purchase_id='".$purchase_id."'")
    or die('error: '.mysqli_error($conn));

  // find supplier
  $get_supplier_query = mysqli_query($conn,"Select * from tbl_suppliers 
  where supplier_id='".$get_purchase_details['supplier_id']."'"); 
  $get_supplier = mysqli_fetch_assoc($get_supplier_query); 



  /*/************/
  /*Export to Excel Started*/
  /*/************/
  $query2 = mysqli_query($conn,"select * from tbl_purchases where 
    tbl_purchases.purchase_id=
    '".$purchase_id."'")
    or die('error: '.mysqli_error($conn));
  $get_purchase_details2 = mysqli_fetch_assoc($query2);

  // get product details
  $get_products_query2 = mysqli_query($conn,"select * from tbl_imei as im
  
  inner join tbl_tac on 
  tbl_tac.item_tac = im.item_tac 

  inner join 
  tbl_purchases as pur on 
  pur.item_imei = im.item_imei 
  
  where
  pur.purchase_id='".$purchase_id."' 
  order by im.id ASC")
  or die('error: '.mysqli_error($conn));


  if(isset($_POST['export-to-excel']) || isset($_POST['download_report'])){

    // Store items in array
    $item_array= array();
    for($i=0;$i < count($_POST['item_imei']); $i++){
      $item_array[] = array(
        'IMEI' => '="'.$_POST['item_imei'][$i].'"',
        'Details'=> $_POST['item_details'][$i],
        'Brand'=> $_POST['item_brand'][$i],
        'Grade'=> $_POST['item_grade'][$i],
        'Color'=> $_POST['item_color'][$i],
        'GB'=> $_POST['item_gb'][$i]
      );
    }

    function ExportFile($records) {
      $heading = false;
      if(!empty($records)){
        foreach($records as $row) {
          if(!$heading) {
            // display field/column names as a first row
            echo implode("\t", array_keys($row)) . "\n";
            $heading = true;
          }
          echo implode("\t", array_values($row)) . "\n";
        }
      }
      exit;
    }

    // $filename = $_POST["ExportType"] . ".xls";		 
    $filename = "PID#".$get_purchase_details['purchase_id']."_".$get_supplier['name']."_".$get_purchase_details['date'].".xls";		 
    header("Content-Type: application/vnd.ms-excel");
    header("Content-Disposition: attachment; filename=\"$filename\"");
    ExportFile($item_array);
    exit();

  }//if ended

/*/************/
/*/Export to Excel Ended*/
/*/************/


include "../../header.php";
?>

<!-- Content Wrapper. Contains page content -->
<div class="content-wrapper">

  <!-- Main content -->
  <section class="content">
    <div class="row">

      <!-- Main content -->
      <div class="col-xs-12">
        <section class="content">

          <form action="" method="POST">
            <div class="row">
              <div class="col-xs-12">
                <div class="box dispatch-note">
                  <div class="box-header">
                    <h3 class="box-title">Purchase Details</h3>
                    <button class="btn print_btn btn-warning pull-right no-print">
                      <i class="fa fa-print"></i> Print Page
                    </button>
                    <button class="btn bg-purple pull-right no-print exportexcel" name="export-to-excel"
                      style="margin-right:10px;">
                      <i class="fa fa-download"></i> Export to Excel
                    </button>
                  </div>
                  <!-- /.box-header -->
                  <div class="box-body">
                    <table id="example1" class="table">
                      <thead>
                        <tr>
                          <td>

                            <b>S4D Limited</b> <br>
                            01782 330780<br>
                            sales@s4dltd.com<br>
                            VAT Registration No.: 202 7041 6

                          </td>
                          <td>
                            <img src="../../assets/uploads/<?php echo $fetch_logo_result['logo_image']; ?>"
                              class="pull-right" style="width:110px;">
                          </td>
                        </tr>
                        <tr>
                          <td>
                            <b>Date :</b>
                            <span class="date"><?php echo $get_purchase_details['date']; ?></span>
                            <br>
                            <b>P.ID :</b>
                            <span class=" purchase_id">IP-<?php echo $purchase_id; ?></span>
                            <br>
                            <b>Supplier :</b>
                            <span class="supplier"><?php echo $get_supplier['name']; ?></span>
                            <br>
                            <b>QC Required :</b>
                            <span class="qc">
                              <?php echo $get_purchase_details['qc_required'] == 1?'Yes':'No'; ?></span>
                            <br>
                          </td>
                        </tr>
                      </thead>
                    </table>
                    <br>

                    <!-- Table row -->
                    <div class="row">
                      <div class="col-xs-12 table-responsive">
                        <table class="table table-bordered">
                          <thead>
                            <tr>
                              <th>Description</th>
                              <th>Qty</th>
                            </tr>
                          </thead>
                          <tbody class="booking-table">
                            <?php $no = 0; ?>
                            <?php while($row = mysqli_fetch_assoc($get_products_query)): ?>
                            <div class="items hide">
                              <p class="item_tac"><?php echo $row['item_tac'];?></p>
                              <p class="hide">
                                <?php $get_modal_query = mysqli_query($conn,"select * from tbl_categories where 
                          category_id='".$row['item_brand']."'");
                          $get_modal = mysqli_fetch_assoc($get_modal_query);
                          ?>
                                <span class="item_brand"><?php echo $get_modal['title']; ?></span>
                                <span class="item_details"><?php echo $row['item_details']; ?></span>
                                <span class="item_color"><?php echo $row['item_color']; ?></span>
                                <span class="item_gb"><?php echo $row['item_gb']; ?></span>
                                <span class="item_grade"><?php 
                            $get_grade_query1 = mysqli_query($conn,"select * from tbl_grades where 
                            grade_id=".$row['item_grade']);
                            $get_grade1 = mysqli_fetch_assoc($get_grade_query1);
                            echo $get_grade1['title']; 
                            
                            ++$no;
                            ?></span>
                              </p>
                            </div>
                            <?php endwhile; ?>
                          </tbody>
                          <tfoot>
                            <tr>
                              <td></td>
                              <td>
                                <b> Total: <?php echo $no; ?></b>
                              </td>
                            </tr>
                          </tfoot>
                        </table>

                        <!-- Save comment -->
                        <b>Comments:</b>
                        <button class="pull-right btn btn-warning save-comment no-print" style="margin-bottom:5px;">
                          <i class="fa fa-refresh fa-spin"></i> Save Comment
                        </button>
                        <input type="text" value="<?php echo $purchase_id; ?>" class="comment-purchase-id hidden">
                        <textarea name="" id="" cols="30" rows="5"
                          class="form-control comment-box"><?php echo $get_purchase_details['report_comment']; ?></textarea>

                        <br>
                        <div class="pull-right">
                          <b class="pull-left">Signature:</b>
                          <span class="pull-right"
                            style="width:180px; height:18px; display:inline-block; border-bottom:1px solid black;"></span>
                          <br>
                          <br>
                          <b class="pull-left">Recieved by Signature:</b>
                          <span class="pull-right"
                            style="width:180px; height:18px; display:inline-block; border-bottom:1px solid black;"></span>
                          <br>
                          <br>
                          <b class="pull-left">Recieved by Print:</b>
                          <span class="pull-right"
                            style="width:180px; height:18px; display:inline-block; border-bottom:1px solid black;"></span>
                          <br>
                          <br>
                        </div>

                      </div>
                    </div>

                  </div>
                  <!-- /.box-body -->
                </div>
                <!-- /.box -->
              </div>


            </div>
        </section>
      </div> <!-- col -->

    </div>
    <!-- /.row -->



    <!-- 
=======
Export to Excel 
=======
-->
    <div class="row">
      <div class="col-xs-12 table-responsive">
        <table class="table table-bordered hide" id="exceldata" style="visibility:visible;">
          <tr>
            <td>IMEI</td>
            <td>Details</td>
            <td>Brand</td>
            <td>Grade</td>
            <td>Color</td>
            <td>GB</td>
          </tr>
          </thead>
          <tbody>
            <?php while($row2 = mysqli_fetch_assoc($get_products_query2)): ?>
            <tr>
              <td>
                <?php echo $row2['item_imei'];?>
                <input type="text" value="<?php echo $row2['item_imei']; ?>" name="item_imei[]">
              </td>
              <td><?php
              echo $row2['item_details']; 
            ?>
                <input type="text" value="<?php echo $row2['item_details']; ?>" name="item_details[]">
              </td>
              <td>
                <?php $get_modal_query2 = mysqli_query($conn,"select * from tbl_categories where 
              category_id='".$row2['item_brand']."'");
              $get_modal2 = mysqli_fetch_assoc($get_modal_query2);
              echo $get_modal2['title']; ?>
                <input type="text" value="<?php echo $get_modal2['title']; ?>" name="item_brand[]">
              </td>
              <td>
                <?php $get_grade_query = mysqli_query($conn,"select * from tbl_grades where 
              grade_id=".$row2['item_grade']);
              $get_grade = mysqli_fetch_assoc($get_grade_query);
              echo $get_grade['title']; ?>
                <input type="text" value="<?php echo $get_grade['title']; ?>" name="item_grade[]">
              </td>
              <td><?php
              echo $row2['item_color']; 
            ?>
                <input type="text" value="<?php echo $row2['item_color']; ?>" name="item_color[]">
              </td>
              <td><?php
              echo $row2['item_gb']; 
            ?>
                <input type="text" value="<?php echo $row2['item_gb']; ?>" name="item_gb[]">
              </td>
            </tr>
            <?php endwhile; ?>
          </tbody>
        </table>
      </div>
    </div>
    <!-- Export to Excel Ended-->
  </section>
  <!-- /.content -->
</div>
<!-- /.content-wrapper -->
</div>

<!-- download modal -->
<div class="modal fade" id="download-modal">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
          <span aria-hidden="true">&times;</span></button>
        <h4 class="modal-title">Do you want to download the Report?</h4>
      </div>
      <div class="modal-footer">
        <button type="submit" name="download_report" class="download_report btn btn-success"
          style="width:80px;">Yes</button>
        <button type="button" class="btn btn-warning" style="width:80px;" data-dismiss="modal">No</button>
      </div>
    </div>
    <!-- /.modal-content -->
  </div>
  <!-- /.modal-dialog -->
</div>
<!-- /download modal -->


</form>

<?php $global_url="../../"; ?>
<?php include $global_url."footer.php";?>

<script>
// print all
$('.print_btn').on('click', function() {
  window.print();
});

// ========
// Email sending 
// ========
// send email after 1 second until all data loaded
setTimeout(function() {
  let emailData = document.querySelectorAll('tbody')[0],
    supplier = document.querySelector('.supplier').innerHTML,
    date = document.querySelector('.date').innerHTML,
    purchase_id = document.querySelector('.purchase_id').innerHTML;

  if (window.location.search.indexOf('email') > 1) {
    $.ajax({
      'type': "POST",
      'url': "includes/purchase_email.php",
      'data': {
        purchase_id,
        date,
        supplier,
        message: emailData.innerHTML
      },
      'success': function(data) {
        console.log("success");
        console.log(data);
      },
      'error': function(data) {
        console.log('error')
        console.log(data);
      }
    });
  }
}, 1000);
//EMAIL WORK COMPLETED


// DISPATCH NOTE VIEW GENERATION
function formatStorage(gbVal) {
  var n = parseInt(gbVal, 10);
  if (!isFinite(n) || isNaN(n)) return '';
  return n >= 1024 ? (n / 1024) + ' TB' : n + ' GB';
}
let itemTacs = [...document.querySelectorAll('.items')];
let items = [],
  finalItems = [],
  count = 0,
  temp = '';

itemTacs.forEach(tac => {
  items.push({
    tac: tac.querySelector('.item_tac').textContent.trim(),
    brand: tac.querySelector('.item_brand').textContent.trim(),
    details: tac.querySelector('.item_details').textContent.trim(),
    color: tac.querySelector('.item_color').textContent.trim(),
    gb: tac.querySelector('.item_gb').textContent.trim(),
    grade: tac.querySelector('.item_grade').textContent.trim()
  });
});

// match each item with one anothe, count the matched ones and replace with null if matched
for (let i = 0; i < items.length; i++) {

  // find if item already selected
  let na = finalItems.filter(item =>
    item.details.toLowerCase() === items[i].details.toLowerCase() &&
    item.color.toLowerCase() === items[i].color.toLowerCase() &&
    item.gb.toLowerCase() === items[i].gb.toLowerCase() &&
    item.brand.toLowerCase() === items[i].brand.toLowerCase() &&
    item.grade.toLowerCase() === items[i].grade.toLowerCase()
  ).length;
  // if item not traversed before
  if (na < 1) {
    for (let j = 0; j < items.length; j++) {
      if (
        items[i].details.toLowerCase() === items[j].details.toLowerCase() &&
        items[i].color.toLowerCase() === items[j].color.toLowerCase() &&
        items[i].gb.toLowerCase() === items[j].gb.toLowerCase() &&
        items[i].brand.toLowerCase() === items[j].brand.toLowerCase() &&
        items[i].grade.toLowerCase() === items[j].grade.toLowerCase()) {
        count++;
      }
    }
    finalItems.push({
      tac: items[i].tac,
      brand: items[i].brand,
      details: items[i].details,
      color: items[i].color,
      gb: items[i].gb,
      grade: items[i].grade,
      qty: count
    });
    count = 0;
  }
}

let calculatedDetails = document.querySelectorAll('.calculated_details'),
  calculatedQty = document.querySelectorAll('.calculated_qty');

finalItems.forEach((item, i) => {
  $('tbody.booking-table').append(
    `<tr>	
        <td>
          <p class="calculated_details">
          ${item.brand} 
          ${item.details} 
          ${item.color} 
          ${item.gb.length > 0 ? formatStorage(item.gb) : ''} 
          ${item.grade.length > 0?'Grade '+item.grade : ''}</p>
        </td>
        <td class="calculated_qty">${item.qty}</td>
      </tr>`);
});

$(window).on('load', function() {
  if (window.location.href.indexOf('email') >= 1) {
    $('#download-modal').modal('show');
  }
});


$('.download_report').on('click', function() {
  $('#download-modal').modal('hide');
})

// SAVE COMMENT
$('.save-comment > i').hide();
$('.save-comment').on('click', function(e) {
  e.preventDefault();
  let comment = $('.comment-box').val();
  let purchaseId = $('.comment-purchase-id').val();
  $('.save-comment > i').show();
  $.ajax({
    'type': "POST",
    'url': "includes/save-comment.php",
    'data': {
      comment,
      purchaseId
    },
    'success': function(data) {
      $('.save-comment > i').hide();

    }
  });

})
</script>
</body>

</html>
