<?php $global_url="../../"; ?>
<?php include '../../db_config.php';  ?>
<?php include "../../authenticate.php" ?>
<?php 

$p_id = $_GET['pur_id'];
$user_id = $_SESSION['user_id'];

$query = "select 

distinct pr.item_code,
pr.purchase_id,
pr.qc_required,
pr.qc_completed

from tbl_serial_purchases as pr

where 

pr.purchase_id = '".$p_id."'";

$result = mysqli_query($conn,$query)

or die('Error:: ' . mysqli_error($conn));

// Save QC
// if(isset($_POST['qc_save'])){

//   header("location:manage_qc.php");
  
// }

?>
<?php include "../../header.php" ?>

  <!-- Content Wrapper. Contains page content -->
  <div class="content-wrapper">
    <!-- Content Header (Page header) -->
    <section class="content-header">
      <div class="col-md-12">
        <div class="row">
          <h3 class="pull-left col-md-6">
            <p>QC Purchase #<?php echo $p_id; ?>
          </h3>
          <div class="col-md-6">
            <div class="row">
              <p class="text-sm col-md-2">Grades Qty:</p>
              <div class="col-md-10">
                <p class="text-sm col-md-2">
                  <i class="fa fa-circle fa-sm text-green"></i>
                    A: <span class="grade-1-count"></span>
                </p>
                <p class="text-sm col-md-2">
                  <i class="fa fa-circle fa-sm text-orange"></i>
                    B: <span class="grade-2-count"></span>
                </p>
                <p class="text-sm col-md-2">
                  <i class="fa fa-circle fa-sm text-red"></i>
                    C: <span class="grade-3-count"></span>
                </p>
                <p class="text-sm col-md-2">
                  <i class="fa fa-circle fa-sm text-purplle"></i>
                    D: <span class="grade-4-count"></span>
                </p>
                <p class="text-sm col-md-2">
                  <i class="fa fa-circle fa-sm text-blue"></i>
                    E: <span class="grade-5-count"></span>
                </p>
                <p class="text-sm col-md-2">
                  <i class="fa fa-circle fa-sm text-yellow"></i>
                    F: <span class="grade-6-count"></span>
                </p>
              </div>
            </div>            

            <div class="row">
              <div class="pull-right col-md-4">
                <p>Passed: <code class="total-passed-label"></code></p>
                <div class="progress progress-xs">
                  <div 
                    class="progress-bar progress-bar-success progress-bar-striped total-passed" 
                    role="progressbar" 
                    aria-valuenow="0" 
                    aria-valuemin="0" 
                    aria-valuemax="100">
                    <span class="sr-only">60% Complete (warning)</span>
                  </div>
                </div>
              </div>
              <div class="col-md-4 pull-right">
                <p>Failed: <code class="total-failed-label"></code></p>
                <div class="progress progress-xs">
                  <div 
                    class="progress-bar progress-bar-danger progress-bar-striped total-failed" 
                    role="progressbar" 
                    aria-valuenow="0" 
                    aria-valuemin="0" 
                    aria-valuemax="100">
                    <span class="sr-only">60% Complete (warning)</span>
                  </div>
                </div>
              </div>
              <div class="col-md-4 pull-right">
                <p>Remaining: <code class="total-remaining-label"></code></p>
                <div class="progress progress-xs">
                  <div 
                    class="progress-bar progress-bar-warning progress-bar-striped total-remaining" 
                    role="progressbar" 
                    aria-valuenow="0" 
                    aria-valuemin="0" 
                    aria-valuemax="100">
                    <span class="sr-only">60% Complete (warning)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>


    </section>

    <!-- Main content -->
    <section class="content">
      <div class="row">

      <form enctype="multipart/form-data" method="post" id="confirm_purchase" action="">
      <!-- Main content -->
        <div class="col-xs-12">
          <section class="content">
            <div class="row">
              <div class="col-xs-12">
                <div class="box">
                  <!-- /.box-header -->
                  <div class="box-body">
                    <div class="multiple-search-container">
                      <input type="text" class="global_filter form-control" placeholder="Search multiple Serials, i.e 1111111111111111, 2222222222222222, 3333333333333333" 
                      id="global_filter">
                      <button class="btn btn-success" id="search_multiple">Search Multiple</button>
                    </div>

                    <table id="example1" class="table table-bordered">
                      <thead>
                        <tr>
                          <th>Item Code</th>
                          <th>Model/Details</th>
                          <th>Grade</th>
                          <th>Cosmetic Passed/Failed</th>
                          <th>Functional Passed/Failed</th>
                          <th>Fault</th>
                          <th>Comments</th>
                        </tr>
                      </thead>
                      <tbody>
                        <?php while($row=mysqli_fetch_assoc($result)): ?>
                        <?php 
                          $product_query = mysqli_query($conn,"select * from tbl_qc_serial_products 
                          where item_code = '".$row['item_code']."' AND purchase_id=".$p_id)
                          or die('Error:: ' . mysqli_error($conn));
                          $product = mysqli_fetch_assoc($product_query);
                        ?>

                        <!-- user Id -->
                        <input type="text" class="user_id hidden" value="<?php echo $user_id; ?>" >
                        <!-- purchase Id -->
                        <input type="text" class="purchase_id hidden" value="<?php echo $p_id; ?>" >
                        
                        <tr>
                          <td>
                            <?php 
                              echo $row['item_code']; 
                            ?>
                            <input type="text" class="form-control hidden item-code" 
                            value="<?php echo $row['item_code']; ?>" name="item_code[]">
                          </td>
                          <td>
                            <?php 
                              $model_query = mysqli_query($conn,"select 
                              item_details, item_grade from tbl_serial_products where 
                              item_code = '".$row['item_code']."'")
                              or die('Error:: ' . mysqli_error($conn));
                              $model = mysqli_fetch_assoc($model_query);
                              echo $model['item_details'];
                            ?>
                          </td>
                          <td>
                            <select name="item_grade[]" class="item-grades form-control">
                            <option value="0">Select</option>
                              <?php 
                                $grade_query = mysqli_query($conn,"select 
                                title, grade_id
                                from tbl_grades")
                                or die('Error:: ' . mysqli_error($conn));
                                while($grade = mysqli_fetch_assoc($grade_query)):
                              ?>
                              <option <?php echo $grade['grade_id'] === $model['item_grade'] ? 'selected':''; ?> 
                                value="<?php echo $grade['grade_id']; ?>">
                                <?php 
                              echo $grade['title'];  
                              ?>
                              </option>
                              <?php endwhile; ?>
                            </select>         
                            </td>
                            <td>
                            <select name="item_cosmetic_passed[]" class="item-cosmetic-passed form-control">
                              <?php if(count($product['item_code']) >= 1){?>
                                <option value="-1" 
                                  <?php echo (int)$product['item_cosmetic_passed'] === -1? 'selected':''; 
                                  ?>
                                >N/A</option>
                                <option value="0" <?php echo (int)$product['item_cosmetic_passed'] === 0?'selected':''; ?>>Failed</option>
                                <option value="1" <?php echo (int)$product['item_cosmetic_passed'] === 1?'selected':''; ?>>Passed</option>

                                <?php } else{?>
                                  <option value="-1">N/A</option>
                                  <option value="0">Failed</option>
                                  <option value="1">Passed</option>
                                <?php } //end if else ?>
                            </select>
                          </td>
                          <td>
                            <select name="item_functional_passed[]" class="item-functional-passed form-control">
                              <?php if(count($product['item_code']) >= 1){?>
                                <option value="-1" 
                                  <?php echo (int)$product['item_functional_passed'] === -1? 'selected':''; 
                                  ?>
                                >N/A</option>
                                <option value="0" <?php echo (int)$product['item_functional_passed'] === 0?'selected':''; ?>>Failed</option>
                                <option value="1" <?php echo (int)$product['item_functional_passed'] === 1?'selected':''; ?>>Passed</option>

                                <?php } else{?>
                                  <option value="-1">N/A</option>
                                  <option value="0">Failed</option>
                                  <option value="1">Passed</option>
                                <?php } //end if else ?>
                            </select>
                          </td>
                          <td>
                            <select name="item_flashed[]" class="item-flashed form-control">
                                <option value="-1" >Select</option>
                              <?php 

                              $flash_query = mysqli_query($conn,"select 
                              title, desc_id
                              from tbl_flash_descriptions")
                              or die('Error:: ' . mysqli_error($conn));
                              while($flash = mysqli_fetch_assoc($flash_query)):
                                ?>
                                <option value="<?php echo $flash['desc_id']?>" 
                                <?php echo $flash['desc_id'] === $product['item_flashed'] ? 'selected' :''?> >
                                  <?php echo $flash['title']?></option>

                                <!-- //   <option value="0">No</option>
                                //   <option value="1">Yes</option> -->

                                <?php endwhile; ?>
                            </select>
                          </td>
                          <td>
                            <input type="text" class="item-comment form-control" name="item_comments[]" 
                            value="<?php echo $product['item_comments']; ?>">
                          </td>
                        </tr>
                      <?php endwhile; ?>
                      </tbody>
                    </table>

                    <?php 
                      $purchase_query = mysqli_query($conn,"select * from tbl_serial_purchases 
                      where purchase_id = '".$p_id."'")
                      or die('Error:: ' . mysqli_error($conn));
                      $purchase_data = mysqli_fetch_assoc($purchase_query);
                    ?>

                    <label class="pull-left bg-purple" 
                    style="font-size:16px; padding:10px; cursor:pointer;">
                      <input type="checkbox" class="qc_completed"
                      name="qc_completed" <?php echo $purchase_data['qc_completed'] == 1?'checked':''; ?>>
                      QC Completed?
                      
                    </label>

                    <!-- <input type="" name="qc_save" value="Save" 
                    class="pull-right btn btn-lg btn-success submit-form"> -->
                    <button class="pull-right btn btn-lg btn-success submit-form">Save</button>
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
  </form>

  </div>
  <!-- /.content-wrapper -->



<?php include $global_url."footer.php";?>
 
<!-- page script -->
<script type="text/javascript">

(function(){
  var table = $("#example1").DataTable({
    ordering:true,
    paging: false,
    info:false,
    statesave: true
  });      


  $('#search_multiple').on('click',function(e){
    e.preventDefault();
    let values = $('#global_filter').val().split(",");
    let multipleValues = '';
    for(let single of values){
      single = single.trim();
      multipleValues += `(${single})|`;
    }
    multipleValues = multipleValues.slice(0,multipleValues.length-1);
    filterGlobal(multipleValues);
  });

  function filterGlobal (values) {
    $('#example1').DataTable().search(
        values,
        true, //enable regex
        false //disable smart search
    ).draw();
  }

  $(document).on('click', '.submit-form', function (e) {
    var table = $('#example1').DataTable();
    var a = document.querySelector('.dataTables_filter input');
    a.value = '';
    table.search('').draw();
  })


  // =========
  // Allow alphanets and numbers in comments only started
  // =========
  var itemComments = document['querySelectorAll']('.item-comment');
  itemComments.forEach(item=>{
    item.addEventListener('input',function(e){
      if(this.value.match(/^[a-z0-9--_ ]+$/i) === null){
        this.value = this.value.slice(0,this.value.length - 1);
      }
    })
  })
  // =========
  // Allow alphanets and numbers in comments only ended
  // =========

})();


(function(){

// ==========
/* Progress bar work started*/
// ==========
  // Globals (and initial/OLD values)
  let 
  itemsData = [], //all items data
  D = document,
  itemsCode = D['querySelectorAll']('.item-code'),
  itemsGrade = D['querySelectorAll']('.item-grades'),
  itemCosmeticPassed = D['querySelectorAll']('.item-cosmetic-passed'),
  itemFunctionalPassed = D['querySelectorAll']('.item-functional-passed'),
  itemFlashed = D['querySelectorAll']('.item-flashed'),
  itemComments = D['querySelectorAll']('.item-comment');
  qcCompleted = D['querySelector']('.qc_completed');

  itemsCode.forEach((item,index)=>{
    itemsData.push({
      code:item.value,
      cosmeticPassed:+itemCosmeticPassed[index].value,
      functionalPassed:+itemFunctionalPassed[index].value,
      flashed: +itemFlashed[index].value,
      comment: itemComments[index].value
    })
  });


  // calculate values
  let totalRemaining = 0, totalFailed = 0, totalPassed = 0, totalItemsCount = itemsCode.length;
  itemsData.forEach(item=>{
    // total remaining
    if(item.cosmeticPassed === -1 && item.functionalPassed === -1){
      totalRemaining++;
    }
    // total cosmetic passed
    else{
      if(item.cosmeticPassed === 1 && item.functionalPassed === 1){
        totalPassed++;
      }
      // total functional passed
      else{
        totalFailed++;
      }
    }
  });

  // print values
  D['querySelector']('.total-remaining').attributes['aria-valuenow'] = totalRemaining,
  D['querySelector']('.total-failed').attributes['aria-valuenow'] = totalFailed,
  D['querySelector']('.total-passed').attributes['aria-valuenow'] = totalPassed;

  D['querySelector']('.total-remaining-label').innerHTML = totalRemaining + "/" + totalItemsCount;
  D['querySelector']('.total-failed-label').innerHTML = totalFailed + "/" + totalItemsCount;
  D['querySelector']('.total-passed-label').innerHTML = totalPassed + "/" + totalItemsCount;

  // percentages
  D['querySelector']('.total-remaining').style.width = (totalRemaining/totalItemsCount)*100 + '%';
  D['querySelector']('.total-failed').style.width = (totalFailed/totalItemsCount)*100 + '%';
  D['querySelector']('.total-passed').style.width = (totalPassed/totalItemsCount)*100 + '%';
// ==========
/* Progress bar work ended*/
// ==========


  // ==========
    /* Grades bar work started*/
    // ==========
    const gradesCount = {
      $1:0,
      $2:0,
      $3:0,
      $4:0,
      $5:0,
      $6:0 
    };
    const gradeValues = D['querySelectorAll']('.item-grades');
    // default values 
    $(`.grade-1-count`).html(0);
    $(`.grade-2-count`).html(0);
    $(`.grade-3-count`).html(0);
    $(`.grade-4-count`).html(0);
    $(`.grade-5-count`).html(0);
    $(`.grade-6-count`).html(0);

    itemsData.forEach((item, index)=>{
      let grade = gradeValues[index];
      if(grade.value !== 0){

        // do not consider the grade if item is not either passed or failed 
          // console.log(item.cosmeticPassed)
          if(item.cosmeticPassed !== -1 && item.functionalPassed !== -1){
            gradesCount[`$${grade.value}`] = gradesCount[`$${grade.value}`] + 1;
            $(`.grade-${grade.value}-count`).html(gradesCount[`$${grade.value}`]);
          }
        }
      });

    // ==========
    /* Grades bar work ended*/
    // ==========

})();



// ==========
/* Form submission work*/
// ==========
(function(){

    // OLD values
  let 
    D = document,
    itemsCode = D['querySelectorAll']('.item-code'),
    itemsGrade = D['querySelectorAll']('.item-grades'),
    itemCosmeticPassed = D['querySelectorAll']('.item-cosmetic-passed'),
    itemFunctionalPassed = D['querySelectorAll']('.item-functional-passed'),
    itemFlashed = D['querySelectorAll']('.item-flashed'),
    itemComments = D['querySelectorAll']('.item-comment');
    qcCompleted = D['querySelector']('.qc_completed');

  let prevItemsData = [];
  itemsCode.forEach((item,index)=>{
    prevItemsData.push({
      code:item.value,
      grade:itemsGrade[index].value,
      cosmeticPassed:+itemCosmeticPassed[index].value,
      functionalPassed:+itemFunctionalPassed[index].value,
      flashed: +itemFlashed[index].value,
      comment: itemComments[index].value,
      qc_completed:qcCompleted.checked
    })
  });


  let submitBtn = document['querySelector']('.submit-form');
  let onSubmit = function(e){
  e.preventDefault();
 
    // adding '-' to all comments if comment box is empty (basically to save all items 
  // in qc db table on first time save )
  itemsCode.forEach((t, i)=>{
    if(itemComments[i].value.trim().length <= 0){
      itemComments[i].value = '-';
    }
  }) 

 this.value = 'SUBMITTING..';
  let user_id = D['querySelector']('.user_id').value,
    purchase_id = D['querySelector']('.purchase_id').value,
    ICP = [], //item cosmetic passed
    IFP = [], //item functional passed
    IFL = [], //item flashed
    ICOM = [], //item comments 
    ICODES = [], //item codes
    GRADES = []; //item grades
  
  // Only consider those items whose values are changed and not all
  itemsCode.forEach((item,index)=>{
    // check change in values in each item
    if(
      itemCosmeticPassed[index].value != prevItemsData[index].cosmeticPassed || 
      itemFunctionalPassed[index].value != prevItemsData[index].functionalPassed ||
      itemFlashed[index].value != prevItemsData[index].flashed ||
      itemsGrade[index].value != prevItemsData[index].grade ||
      itemComments[index].value != prevItemsData[index].comment
    ){
      ICP.push(itemCosmeticPassed[index].value);
      IFP.push(itemFunctionalPassed[index].value);
      IFL.push(itemFlashed[index].value);
      ICOM.push(itemComments[index].value);
      GRADES.push(itemsGrade[index].value);  
      ICODES.push(item.value);
    }

  });

  // if there is any change detected or qc completed values has been changed,
  // either way if there is any change detected, submit the form
  // console.log(qcCompleted.checked)
  if(ICODES.length > 0 || qcCompleted.checked != prevItemsData[0].qc_completed){
    $.ajax({
      'type': "POST",
      'url': "save_qc.php",
      'data': {
        user_id,
        item_functional_passed:IFP,
        item_cosmetic_passed:ICP,
        item_comments:ICOM,
        item_flashed:IFL,
        item_code:ICODES,
        item_grade:GRADES,
        purchase_id,
        qc_completed:qcCompleted.checked
      },
      'success': (data) => {
        this.value = 'SUBMIT';
        console.log('success');
        location.reload();
      },
      'error':(data) =>{
        this.value = 'SUBMIT';
        console.log('error');
        location.reload();
      }
    })
    
    // Redraw datatable  
    var table = $('#example1').DataTable();
    var a = document.querySelector('.dataTables_filter input');
    a.value = '';
    table.search('').draw();

  } //if closed


  };
  submitBtn.addEventListener('click',onSubmit);

})();
// ==========
/* Form submission work*/
// ==========

</script>

</body>
</html>
