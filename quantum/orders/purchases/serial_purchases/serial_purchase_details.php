<?php //error_reporting(E_ALL & ~E_NOTICE); ?>
<?php include '../../db_config.php';  ?>
<?php //include 'includes/purchase_email.php';  ?>
<?php include "../../authenticate.php" ?>
<?php $global_url="../../"; ?>
<?php 

  // get purchase details
  $purchase_id = $_GET['pur_id'];
  $query = mysqli_query($conn,"SELECT * FROM tbl_serial_purchases 
  WHERE purchase_id='".$purchase_id."'")
  or die('error: '.mysqli_error($conn));
  $get_purchase_details = mysqli_fetch_assoc($query);

  $get_supplier_query = mysqli_query($conn,"Select * from tbl_suppliers 
  where supplier_id='".$get_purchase_details['supplier_id']."'");
  $get_supplier = mysqli_fetch_assoc($get_supplier_query);


/*/************/
/*Export to Excel Started*/
/*/************/
if(isset($_POST['export-to-excel'])  || isset($_POST['download_report'])){

    // Store items in array
    $item_array= array();
    for($i=0;$i < count($_POST['item_code']); $i++){
      $item_array[] = array(
        'Item Code' => $_POST['item_code'][$i],
        'Brand'=> $_POST['item_brand'][$i],
        'Grade'=> $_POST['item_grade'][$i],
        'Details'=> $_POST['item_details'][$i]
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
/*Export to Excel Ended*/
/*/************/

?>



<?php include "../../header.php";
?>

<!-- Content Wrapper. Contains page content -->
<div class="content-wrapper">

  <!-- Main content -->
  <section class="content">
    <div class="row">

      <form action="" method="POST">
        <!-- Main content -->
        <div class="col-xs-12">
          <section class="content">
            <div class="row">
              <div class="col-xs-12">
                <div class="box dispatch-note">
                  <div class="box-header no-print">
                    <h3 class="box-title">Purchase Details</h3>
                    <button class="btn print_btn btn-warning pull-right">
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
                            <span class="purchase_id">SP-<?php echo $purchase_id; ?></span>
                            <br>
                            <b>Supplier :</b>
                            <span class="supplier"><?php echo $get_supplier['name']; ?></span>
                            <br>
                            <b>QC Required :</b>
                            <span class="qc_required">
                              <?php echo $get_purchase_details['qc_required'] == 1?'Yes':'No'; ?>
                            </span>
                            <br>
                          </td>
                        </tr>
                      </thead>
                    </table>
                    <br>

                    <!-- Table row -->
                    <div class="row">
                      <div class="col-xs-12 table-responsive">
                        <table class="table table-bordered items_table">
                          <thead>
                            <tr>
                              <th>Description</th>
                              <th>Qty</th>
                            </tr>
                          </thead>
                          <tbody class="booking-table">
                            <?php $no = 0; ?>
                            <?php 
                    // get product details
                    $get_products_query = mysqli_query($conn,"select * from 
                      tbl_serial_products as pr
                      inner join tbl_serial_purchases as pu 
                      on pu.item_code = pr.item_code 
                      where pu.purchase_id='".$purchase_id."' 
                      order by pr.id ASC")
                      or die('error: '.mysqli_error($conn));
                      while($row = mysqli_fetch_assoc($get_products_query)): 
                    ?>
                            <tr class="items hide">
                              <td>
                                <p class="item_code"><?php echo $row['item_code'];?></p>
                                <input type="text" value="<?php echo $row['item_code']; ?>" name="item_code[]"
                                  class="hidden">
                              </td>
                              <td>
                                <?php $get_modal_query = mysqli_query($conn,"select * from tbl_categories where 
                          category_id='".$row['item_brand']."'") ?>
                                <?php $get_modal = mysqli_fetch_assoc($get_modal_query); ?>
                                <p class="item_brand"><?php echo $get_modal['title']; ?></p>
                                <input type="text" class="hidden" value="<?php echo $get_modal['title']; ?>"
                                  name="item_brand[]">
                              </td>
                              <td>
                                <?php $get_grade_query = mysqli_query($conn,"select * from tbl_grades where 
                          grade_id=".$row['item_grade']) ?>
                                <?php $get_grade = mysqli_fetch_assoc($get_grade_query); ?>
                                <p class="item_grade"><?php echo $get_grade['title']; ?></p>
                                <input type="text" class="hidden" value="<?php echo $get_grade['title']; ?>"
                                  name="item_grade[]">
                              </td>
                              <td>
                                <p class="item_details"><?php echo $row['item_details']; ?></p>
                                <input type="text" class="hidden" value="<?php echo $row['item_details']; ?>"
                                  name="item_details[]">
                              </td>
                              <?php ++$no; ?>
                            </tr>
                            <?php endwhile; ?>
                          </tbody>
                          <tfoot>
                            <tr>
                              <td></td>
                              <td><b>Total: <?php echo $no; ?></b></td>
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
        </div>
        <!-- col -->
    </div>
    <!-- /.row -->
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
  let emailData = document.querySelector('.items_table tbody'),
    supplier = document.querySelector('.supplier').innerHTML,
    date = document.querySelector('.date').innerHTML,
    purchase_id = document.querySelector('.purchase_id').innerHTML;

  if (window.location.search.indexOf('email') > 1) {
    $.ajax({
      'type': "POST",
      'url': "includes/serial_purchase_email.php",
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
let itemTacs = [...document.querySelectorAll('.items')];
let items = [],
  finalItems = [],
  count = 0,
  temp = '';

itemTacs.forEach(tac => {
  items.push({
    code: tac.querySelector('.item_code').textContent.trim(),
    brand: tac.querySelector('.item_brand').textContent.trim(),
    details: tac.querySelector('.item_details').textContent.trim(),
    grade: tac.querySelector('.item_grade').textContent.trim()
  });
});

// match each item with one anothe, count the matched ones and replace with null if matched
for (let i = 0; i < items.length; i++) {

  // find if item already selected
  let na = finalItems.filter(item =>
    item.details.toLowerCase() === items[i].details.toLowerCase() &&
    item.brand.toLowerCase() === items[i].brand.toLowerCase() &&
    item.grade.toLowerCase() === items[i].grade.toLowerCase()
  ).length;
  // if item not traversed before
  if (na < 1) {
    for (let j = 0; j < items.length; j++) {
      if (
        items[i].details.toLowerCase() === items[j].details.toLowerCase() &&
        items[i].brand.toLowerCase() === items[j].brand.toLowerCase() &&
        items[i].grade.toLowerCase() === items[j].grade.toLowerCase()
      ) {
        count++;
      }
    }
    finalItems.push({
      code: items[i].tac,
      brand: items[i].brand,
      details: items[i].details,
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
          ${item.details} ${item.grade.length > 0?'Grade '+item.grade : ''}</p>
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