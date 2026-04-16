<?php $global_url="../"; ?>
<?php include '../db_config.php';  ?>
<?php include "../authenticate.php" ?>
<?php include "../header.php" ?>

    <!-- Content Wrapper. Contains page content -->
    <div class="content-wrapper">
      <!-- Content Header (Page header) -->
      <section class="content-header">
        <h1 class="pull-left">
          Manage Products
        </h1>
        <a href="manage_categories.php" class="btn btn-success btn-lg pull-right">
          Manage Brands
        </a>
      </section>

      <!-- Main content -->
      <section class="content">
        <div class="row">

        <!-- Main content -->
          <div class="col-xs-12">
            <section class="content">
              <div class="row">
                <div class="col-xs-12">
                  <div class="box box-success">
                    <!-- /.box-header -->
                    <div class="box-body">

                    <!-- datatable begins-->
                    <div class="custom_datatable">
                      <div class="table-wrapper">
                        <div class="table-filter">
                            <div class="row">
                              <div class="col-sm-12">
                                  <div class="filter-group">
                                    <input type="text" class="form-control  search-datatable" placeholder="Search ID">
                                  </div>
                              </div>
                            </div>
                        </div>
                        <table class="table table-striped table-hover">
                          <thead>
                            <tr>
                              <th>P.ID</th>
                              <th>IMEI</th>
                              <th>Brand</th>
                              <th>Tray</th>
                              <th>Color</th>
                              <th>GB</th>
                              <th>Grade</th>
                              <th>Details</th>
                              <th>Status</th>

                            </tr>
                          </thead>
                            <tbody>
                              <tr>
                                <td>5</td>
                                <td><a href="#"><img src="/examples/images/avatar/5.jpg" class="avatar" alt="Avatar"> Martin Sommer</a></td>
                                <td>Paris</td>
                                <td>Aug 04, 2017</td>
                                <td><span class="status text-success">&bull;</span> Delivered</td>
                                <td>$580</td>
                                <td><a href="#" class="view" title="View Details" data-toggle="tooltip"><i class="material-icons">&#xE5C8;</i></a></td>
                              </tr>
                            </tbody>
                        </table>
                        <div class="data-loading">
                    <div class="spinner">
                      <div class="bounce1"></div>
                      <div class="bounce2"></div>
                      <div class="bounce3"></div>
                    </div>
                    Processing
                  </div>
                        <div class="clearfix">
                          <div class="pagination-wrapper">
                            <div class="prev-next-btn" data-value="previous"><a href="#" class="page-link">Previous</a></div>
                            <div class="current-page-btn"><b>Page: <span class="current-page">1</span> of <span class="total-pages"></span></b></div>
                            <div class="prev-next-btn" data-value="next"><a href="#" class="page-link">Next</a></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="brand-list hide">
                      <?php $get_category = mysqli_query($conn,"select title, category_id from tbl_categories")
                      or die('Error: '.mysqli_error($conn)); 
                      while($brands = mysqli_fetch_assoc($get_category)){
                        echo '<span>'.$brands['title']."-".$brands['category_id']."</span>";
                      }
                      ?>
                    </div>
                    <!-- /datatable ended-->

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


<?php include $global_url."footer.php";?>
<script>

// show loading text by default
let dataLoading = document.querySelector('.data-loading');
dataLoading.style.display = 'block',

// Global Table state
tableState = {
  currentPage : 1,
  totalPages: undefined
};

//important: Brands (this allow us to convert brand id from db to brand title)
let brandsList = document.querySelectorAll(".brand-list > span"),
brands = [];
for(let i=0;i<brandsList.length;i++){
  let content = brandsList[i].innerHTML;
  brands.push({
    id:content.slice(content.indexOf('-')+1,content.length),
    title:content.slice(0,content.indexOf('-'))
  })
}

// fetch datatable data
function fetchData(pageId, searchIMEI){
  // if search input and not pagination input
  if(arguments[0] === null){
    $.ajax({
        'type': "POST",
        'url': "server_processing.php",
        'data':{
          searchIMEI
        },
        'success': function (data) {
          data = JSON.parse(data);
          let rowsData = data.data;
          console.log(data);

          // hide loading
          dataLoading.style.display = 'none';
          if(rowsData.length) drawTableRow(rowsData);
        }
      });//ajax done
  }
  else{
    //update current page
    tableState.currentPage = pageId;
    document.querySelector('.current-page-btn > b > span').innerHTML = pageId;

    $.ajax({
        'type': "POST",
        'url': "server_processing.php",
        'data':{
          pageId
        },
        'success': function (data) {
          data = JSON.parse(data);
          let rowsData = data.data;
          tableState.totalPages = Math.ceil(data.total_rows / 10);
          document.querySelector('.total-pages').innerHTML = tableState.totalPages;

          // hide loading
          dataLoading.style.display = 'none';
          if(rowsData.length) drawTableRow(rowsData);
        }
    });//ajax ended

  } //else ended
}//fetchdata ended

fetchData(1); //run on page load

// add data to table on every ajax call
const drawTableRow = function(rowsData){
  let tbody = document.getElementsByTagName('tbody')[0];
  // create row for each data
  tbody.innerHTML = '';
  rowsData.forEach(val => {
    let tr = document.createElement('tr');
    let { 
      purchase_id,
      item_imei,
      tray_id,
      item_color,
      item_gb,
      item_grade,
      item_details,
      item_brand,
      status
    } = val;

    let category = brands.filter(item=>item.id === item_brand)[0].title;

    tr.innerHTML = 
       `<td>${purchase_id}</td>
       <td><a href="products/item_details.php?item_id={item_imei}">${item_imei}</a></td>
       <td>${category}</td>
       <td>${tray_id}</td>
       <td>${item_color}</td>
       <td>${item_gb}B</td>
       <td>${item_grade}</td>
       <td>${item_details}</td>
       <td>${status}</td>
       `;
    tbody.appendChild(tr);
  })
};

// assign click event on each page button
let pageNum = document.getElementsByClassName('page-item');
for(let i=0; i<pageNum.length; i++){
  pageNum[i].addEventListener('click',function(){
    dataLoading.style.display = 'block';
      fetchData(i+1);
    })
}

// assign click event to prev next button
let prevNextBtn = document.getElementsByClassName('prev-next-btn');
for(let i=0; i<prevNextBtn.length; i++){
  prevNextBtn[i].addEventListener('click',function(e){
    if(this.dataset.value === 'next'){
      if(tableState.currentPage < tableState.totalPages) tableState.currentPage++;
      else return;
    }
    else if(this.dataset.value === 'previous'){
      if (tableState.currentPage > 1) tableState.currentPage--;
      else return;
    }
    dataLoading.style.display = 'block';
    fetchData(tableState.currentPage);
  })
}

//search datable
const searchInput = document.querySelector('.search-datatable');
searchInput.onkeyup = function (e) {
    if (searchInput.value.length <= 16 && searchInput.value.length >= 15) {
        fetchData(null, searchInput.value);
    } 
    else if (searchInput.value.length > 0){
        alert('Invalid item ID!!!!');
    }
    else {
        fetchData(tableState.currentPage);
    }
}

</script>