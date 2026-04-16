<?php include '../../db_config.php';  ?>
<?php $global_url="../../"; ?>
<?php include "../../authenticate.php" ?>
<?php 

$p_id = $_GET['pur_id'];
$user_id = $_SESSION['user_id'];

$query = "select 

distinct pr.item_imei,
pr.date,
pr.purchase_id,
pr.repair_required,
pr.repair_completed

from tbl_purchases as pr
where 
pr.purchase_id = '".$p_id."' 
";
$result = mysqli_query($conn,$query)
or die('Error:: ' . mysqli_error($conn));


$get_part = mysqli_query($conn,"select title, id, item_brand, item_qty from tbl_parts_products where
item_qty > 0")
or die('Error:: ' . mysqli_error($conn));


// Save REPAIR
// if(isset($_POST['repair_save'])){ 


  // ....

  // header("location:manage_repair.php");
  
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
            <p>Repair Purchase #<?php echo $p_id; ?>
          </h3>
        </div>
      </div>


    </section>

    <!-- Main content -->
    <section class="content">
      <div class="row">

      <!-- <form enctype="multipart/form-data" method="post" id="confirm_purchase" action=""> -->
      <!-- Main content -->
        <div class="col-xs-12">
          <section class="content">
            <div class="row">
              <div class="col-xs-12">
                <div class="box">                
                  <!-- /.box-header -->
                  <div class="box-body">
                    <div class="multiple-search-container">
                      <input type="text" class="global_filter form-control" placeholder="Search multiple IMEIs, i.e 1111111111111111,      2222222222222222,      3333333333333333" 
                      id="global_filter">
                      <button class="btn btn-success" id="search_multiple">Search Multiple</button>
                    </div>
                    <table id="example1" class="table table-bordered">
                      <thead>
                        <tr>
                          <th>Item Code</th>
                          <th>Model/Details</th>
                          <th>Color</th>
                          <th>GB</th>
                          <th>Grade</th>
                          <th>Parts</th>
                          <th>Comments</th>
                        </tr>
                      </thead>
                      <tbody>
                        <!-- user Id -->
                        <input type="text" class="user_id hidden" value="<?php echo $user_id; ?>" >
                        <!-- purchase Id -->
                        <input type="text" class="purchase_id hidden" value="<?php echo $p_id; ?>" >

                        <?php while($row=mysqli_fetch_assoc($result)): ?>
                        <?php 
                          $product_query = mysqli_query($conn,"select * from 
                          tbl_repair_imei_products 
                          where item_code = '".$row['item_imei']."' AND 
                          purchase_id=".$p_id)
                          or die('Error:: ' . mysqli_error($conn));
                          $product = mysqli_fetch_assoc($product_query);
                        ?>
                        <tr>
                          <td>
                          <?php 
                              echo $row['item_imei'];
                            ?>
                            <input type="text" class="item-code form-control hidden" 
                            value="<?php echo $row['item_imei']; ?>" name="item_code[]">
                          </td>
                          <td>
                            <?php 
                              $model_query = mysqli_query($conn,"select 
                              tbl_tac.item_details,
                              tbl_imei.item_color,
                              tbl_imei.item_grade,
                              tbl_imei.item_gb 
                              from 
                              tbl_tac inner join tbl_imei 
                              on tbl_tac.item_tac = tbl_imei.item_tac
                              where tbl_imei.item_imei = '".$row['item_imei']."'")
                              or die('Error:: ' . mysqli_error($conn));
                              $model = mysqli_fetch_assoc($model_query);
                              echo $model['item_details'];
                            ?>
                          </td>
                          <td>
                          <?php 
                            echo $model['item_color'];
                          ?>
                          </td>
                          <td>
                          <?php 
                            echo $model['item_gb'];
                          ?>
                          </td>
                          <td>
                            <?php 
                              $grade_query = mysqli_query($conn,"select 
                              title
                              from tbl_grades where grade_id='".$model['item_grade']."'")
                              or die('Error:: ' . mysqli_error($conn));
                              $grade = mysqli_fetch_assoc($grade_query);
                            ?>
                              <?php 
                                echo isset($grade['title'])?$grade['title']:'-';
                              ?>
                          </td>
                          <td>

                          <?php 
                              $part_query = mysqli_query($conn,"select 
                              p.title,
                              r.part_qty
                              from tbl_parts_products as p 
                              inner join tbl_repair_imei_parts as r 
                              on r.part_id = p.id
                              
                              where r.item_code='".$row['item_imei']."' AND 
                               r.purchase_id='".$row['purchase_id']."'")
                              or die('Error:: ' . mysqli_error($conn));
                              while($part = mysqli_fetch_assoc($part_query)):
                              ?>
                                <p class="label label-default" style="margin-right:3px;">
                                  <?php echo $part['title']; ?> (<?php echo $part['part_qty']; ?>)
                                </p>

                            <?php 
                              endwhile;
                            ?>

                            <button class="view-parts btn-link">
                              <a class="label label-warning" href="<?php echo 'parts/edit_parts.php?item_code='.$row['item_imei'].'&pid='.$row['purchase_id'] ?>">
                                <i class="fa fa-pencil"></i>
                              </a></button>
                          </td>
                          <td>
                            <input type="text" class="item-comment form-control" name="item_comments[]" 
                            value="<?php echo isset($product['item_comments']) ? $product['item_comments'] : '-'; ?>">
                          </td> 
                        </tr>
                      <?php endwhile; ?>
                      </tbody>
                    </table>

                    <?php 
                      $purchase_query = mysqli_query($conn,"select * from tbl_purchases 
                      where purchase_id = '".$p_id."'")
                      or die('Error:: ' . mysqli_error($conn));
                      $purchase_data = mysqli_fetch_assoc($purchase_query);
                    ?>

                    <label class="pull-left bg-purple" 
                    style="font-size:16px; padding:10px; cursor:pointer;">
                      <input type="checkbox" class="repair_completed" 
                      name="repair_completed" <?php echo $purchase_data['repair_completed'] == 1?'checked':''; ?>>
                      Repair Completed?                      
                    </label>

                    <input type="submit" name="repair_save" value="Save" 
                    class="pull-right btn btn-lg btn-success submit-form">
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
  <!-- </form> -->

  </div>
  <!-- /.content-wrapper -->
</div>



<?php include $global_url."footer.php";?>

<script type="text/javascript">


(function(){
  var table = $("#example1").DataTable({
    ordering:true,
    paging: false,
    info:false,
    statesave: true,
    drawCallback: function( settings ) {
      $("div.dataTables_filter input").focus();
    }
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


  

// ==========
/* Form submission work*/
// ==========
(function(){

// OLD values
let 
D = document,
itemsCode = D['querySelectorAll']('.item-code'),
  // itemsGrade = D['querySelectorAll']('.item-grades'),
itemComments = D['querySelectorAll']('.item-comment');
repairCompleted = D['querySelector']('.repair_completed');

  // Identify which values are changed and update them only
  // Filling prev values below
  let prevItemsData = [];
  itemsCode.forEach((item,index)=>{
    prevItemsData.push({
      code:item.value,
      // grade:itemsGrade[index].value,
      comment: itemComments[index].value,
      qc_completed:repairCompleted.checked
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

    let user_id = D['querySelector']('.user_id').value,
      purchase_id = D['querySelector']('.purchase_id').value,
      ICOM = [], // new item comments 
      ICODES = []; // new item codes
      // GRADES = []; // new item grades

    // Only consider those items whose values are changed and not all
    itemsCode.forEach((item,index)=>{
      console.log(item)
      // check change in values in each item
      if(
        // itemsGrade[index].value != prevItemsData[index].grade ||
        itemComments[index].value != prevItemsData[index].comment
      ){
        ICOM.push(itemComments[index].value);
        // GRADES.push(itemsGrade[index].value);
        ICODES.push(item.value);
      }

    });

  // if there is any change detected or qc completed values has been changed,
  // either way if there is any change detected, submit the form
  // console.log(repairCompleted.checked)
  if(ICODES.length > 0 || repairCompleted.checked != prevItemsData[0].qc_completed){
    this.value = 'SUBMITTING..'
      $.ajax({
      'type': "POST",
      'url': "save_repair.php",
      'data': {
        user_id,
        item_comments:ICOM,
        item_code:ICODES,
        purchase_id,
        // item_grade:GRADES,
        repair_completed:repairCompleted.checked
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
    });
    
    // Redraw datatable  
    var table = $('#example1').DataTable();
    var a = document.querySelector('.dataTables_filter input');
    a.value = '';
    table.search('').draw();

  } //if closed

  };
  submitBtn.addEventListener('click',onSubmit);

})()
  // ==========
  /* Form submission work*/
  // ==========


</script>
</body>
</html>