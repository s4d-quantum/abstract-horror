<?php error_reporting(E_ALL & ~E_NOTICE); ?>
<?php include '../../db_config.php';  ?>
<?php include "../../authenticate.php" ?>
<?php $global_url="../../"; ?>
<?php 

  // get purchase details
  $purchase_id = $_GET['ret_id'];
  $query = mysqli_query($conn,"select * from tbl_purchase_return where 
  return_id='".$purchase_id."'")
  or die('error: '.mysqli_error($conn));

  $get_purchase_details = mysqli_fetch_assoc($query);

  // // get product details
  $get_products_query = mysqli_query($conn,"select 
    pr.return_id,
    pr.date,
    pr.item_imei,

    tc.item_details,
    tc.item_brand,

    im.item_color,
    im.item_gb,
    im.item_tac

    from tbl_purchase_return as pr 
 
    inner join tbl_imei as im on 
    pr.item_imei = im.item_imei 
 
    inner join tbl_tac as tc 
    on tc.item_tac = im.item_tac 
    
    where 
    pr.return_id = '".$purchase_id."'")
    or die('error: '.mysqli_error($conn));
    


/*/************/
/*Export to Excel Started*/
/*/************/
$get_products_query2 = mysqli_query($conn,"select 
pr.return_id,
pr.date,
pr.item_imei,
tc.item_details,
tc.item_brand,
im.item_color,
im.item_gb,
im.item_tac
from tbl_purchase_return as pr 

inner join tbl_imei as im on 
pr.item_imei = im.item_imei 

inner join tbl_tac as tc 
on tc.item_tac = im.item_tac 

where 
pr.return_id = '".$purchase_id."'")
or die('error: '.mysqli_error($conn));

  if(isset($_POST['export-to-excel']) || isset($_POST['download_report'])){

    // Store items in array
    $item_array= array();
    for($i=0;$i < count($_POST['item_imei']); $i++){
      $item_array[] = array(
        'IMEI' => '="'.$_POST['item_imei'][$i].'"',
        'Details'=> $_POST['item_details'][$i],
        'Brand'=> $_POST['item_brand'][$i],
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
    $filename = "PRID#".$get_purchase_details['return_id']."_".$_POST['supplier']."_".$get_purchase_details['date'].".xls";		 
    header("Content-Type: application/vnd.ms-excel");
    header("Content-Disposition: attachment; filename=\"$filename\"");
    ExportFile($item_array);
    exit();

  }//if ended

/*/************/
/*/Export to Excel Ended*/
/*/************/

?>


<?php include "../../header.php";
?>

<!-- Content Wrapper. Contains page content -->
<div class="content-wrapper">

  <!-- Main content -->
  <section class="content">
    <div class="row">
      <form method="post" action="">

        <!-- Main content -->
        <div class="col-xs-12">
          <section class="content">
            <div class="row">
              <div class="col-xs-12">
                <div class="box dispatch-note">
                  <div class="box-header no-print">
                    <h3 class="box-title">Purchase Return Details</h3>
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
                    <?php $get_supplier_query = mysqli_query($conn,"Select * from 
                tbl_suppliers as sp 
                inner join tbl_purchases as pr on pr.supplier_id = sp.supplier_id
                inner join tbl_imei as im on im.purchase_id = pr.purchase_id 
                where im.item_imei = '".$get_purchase_details['item_imei']."'") ?>
                    <?php $get_supplier = mysqli_fetch_assoc($get_supplier_query); ?>

                    <?php 
                include "../../shared/invoice_header.php";
                invoiceHeader(
                  false, 
                  $get_supplier, 
                  $purchase_id, 
                  $get_purchase_details,
                  "Return# : <span class='order_id'>IPR-". $purchase_id."</span>"
                );               
              ?>
                    <br>

                    <div id="<?php echo $get_purchase_details['supplier_id']; ?>">
                      <!-- Table row -->
                      <div class="row">
                        <div class="col-xs-12 table-responsive">
                          <table class="table table-bordered">
                            <tr>
                              <th>Details</th>
                              <th>Qty</th>
                            </tr>
                            </thead>
                            <tbody class="details">
                              <?php while($row = mysqli_fetch_assoc($get_products_query)): ?>

                              <!-- Fetch Category Title -->
                              <?php $get_modal_query = mysqli_query($conn,"select * from tbl_categories where 
                    category_id='".$row['item_brand']."'") ?>
                              <?php $get_modal = mysqli_fetch_assoc($get_modal_query); ?>
                              <!-- /Fetch Category Title -->

                              <tr class="items hidden">
                                <td>
                                  <p class="item_imei hide"><?php echo $row['item_imei'];?></p>
                                  <p class="item_tac"><?php echo $row['item_tac'];?></p>
                                </td>
                                <td class="item_brand">
                                  <?php echo $get_modal['title']; ?>
                                </td>
                                <td class="item_details"><?php
                          echo $row['item_details']; 
                        ?>
                                </td>
                                <td class="item_color"><?php
                          echo $row['item_color']; 
                        ?>
                                </td>
                                <td class="item_gb"><?php
                          echo $row['item_gb']; 
                        ?>
                                </td>
                              </tr>
                              <?php endwhile; ?>
                            </tbody>
                          </table>

                          <table class="hidden">
                            <tbody>
                              <?php while($row1 = mysqli_fetch_assoc($get_products_query2)): ?>

                              <!-- Fetch Category Title -->
                              <?php $get_modal_query = mysqli_query($conn,"select * from tbl_categories where 
                    category_id='".$row1['item_brand']."'") ?>
                              <?php $get_modal = mysqli_fetch_assoc($get_modal_query); ?>
                              <!-- /Fetch Category Title -->

                              <tr>
                                <td>
                                  <input type="text" value="<?php echo $row1['item_imei'];?>" name="item_imei[]">

                                </td>
                                <td class="">
                                  <input type="text" value="<?php echo $get_modal['title']; ?>" name="item_brand[]">

                                </td>
                                <td class="">
                                  <input type="text" value="<?php
                            echo $row1['item_details']; 
                          ?>" name="item_details[]">

                                </td>
                                <td class="">
                                  <input type="text" value="<?php
                            echo $row1['item_color']; 
                          ?>" name="item_color[]">

                                </td>
                                <td class="">
                                  <input type="text" value="<?php
                            echo $row1['item_gb']; 
                          ?>" name="item_gb[]">

                                </td>
                              </tr>
                              <?php endwhile; ?>

                            </tbody>
                          </table>

                          <b>Comments:</b>
                          <button class="pull-right btn btn-warning save-comment no-print" style="margin-bottom:5px;">
                            <i class="fa fa-refresh fa-spin"></i> Save Comment
                          </button>
                          <input type="text" value="<?php echo $purchase_id; ?>" class="comment-return-id hidden">
                          <textarea name="" id="" cols="30" rows="5"
                            class="form-control comment-box"><?php echo $get_purchase_details['report_comment']; ?></textarea>

                          <br>
                          <div class="pull-left">
                            <b>Courier: </b> <?php echo $get_purchase_details['delivery_company']; ?> <br>
                            <b>Tracking No: </b>
                            <span id="dpd-status">
                              <?php
                            if(strlen($get_purchase_details['tracking_no']) > 1):
                              echo $get_purchase_details['tracking_no'];
                          ?>
                              <span id="dpd-result">
                                <i style="margin-top:15px" class="fa fa-spinner fa-spin"></i>
                              </span>
                              <?php 
                          else:
                          // Display "N.A." if there are zero or one tracking numbers.
                          echo 'N.A.';
                        endif;
                        ?>
                            </span>
                          </div>

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
// DISPATCH NOTE VIEW GENERATION
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
    gb: tac.querySelector('.item_gb').textContent.trim()
  });
});

function formatStorage(gbVal) {
  var n = parseInt(gbVal, 10);
  if (!isFinite(n) || isNaN(n)) return '';
  return n >= 1024 ? (n / 1024) + ' TB' : n + ' GB';
}

// match each item with one anothe, count the matched ones and replace with null if matched
for (let i = 0; i < items.length; i++) {

  // find if item already selected
  let na = finalItems.filter(item =>
    item.details.toLowerCase() === items[i].details.toLowerCase() &&
    item.color.toLowerCase() === items[i].color.toLowerCase() &&
    item.gb.toLowerCase() === items[i].gb.toLowerCase() &&
    item.brand.toLowerCase() === items[i].brand.toLowerCase()
  ).length;
  // if item not traversed before
  if (na < 1) {
    for (let j = 0; j < items.length; j++) {
      if (
        items[i].details.toLowerCase() === items[j].details.toLowerCase() &&
        items[i].color.toLowerCase() === items[j].color.toLowerCase() &&
        items[i].gb.toLowerCase() === items[j].gb.toLowerCase() &&
        items[i].brand.toLowerCase() === items[j].brand.toLowerCase()) {
        count++;
      }
    }

    finalItems.push({
      tac: items[i].tac,
      brand: items[i].brand,
      details: items[i].details,
      color: items[i].color,
      gb: items[i].gb,
      qty: count
    });
    count = 0;
  }
}

let calculatedDetails = document.querySelectorAll('.calculated_details'),
  calculatedQty = document.querySelectorAll('.calculated_qty');
finalItems.forEach((item, i) => {
  $('tbody.details').append(
    `<tr>	
        <td>
          <p class="calculated_details">
          ${item.brand} 
          ${item.details} 
          ${item.color} ${item.gb.length > 0 ? formatStorage(item.gb) : ''}</p>
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

// print all
$('.print_btn').on('click', function() {
  window.print();
});


// SAVE COMMENT
$('.save-comment > i').hide();
$('.save-comment').on('click', function(e) {
  e.preventDefault();
  let comment = $('.comment-box').val();
  let returnId = $('.comment-return-id').val();
  $('.save-comment > i').show();
  $.ajax({
    'type': "POST",
    'url': "includes/save-return-comment.php",
    'data': {
      comment,
      returnId
    },
    'success': function(data) {
      $('.save-comment > i').hide();

    }
  });
});

// fetch dpd tracking status
let dpdStatus = document.getElementById('dpd-status').innerText.trim();
if (!!dpdStatus && dpdStatus.length > 5) {

  $.ajax({
    type: "POST",
    url: "../../orders/imei/includes/fetch_delivery_status.php",
    data: {
      dpd_status: dpdStatus
    },
    success: function(response) {
      parser = new DOMParser();
      xmlDoc = parser.parseFromString(response, "text/xml");
      let result = xmlDoc.getElementsByTagName("trackingresponse")[0]
        .childNodes[0]
        .childNodes[0]
        .getElementsByTagName('trackingevents')[0]
        .childNodes[0]
        .getElementsByTagName('description')[0]
        .innerHTML;


      $('#dpd-result').text(` - ${result}`);
    },
    error: function(err) {
      $('#dpd-result').text("");
    }
  });
}
</script>
</body>

</html>
