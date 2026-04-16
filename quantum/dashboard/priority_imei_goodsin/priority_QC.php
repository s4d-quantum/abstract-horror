<?php $global_url="../../../"; ?>

<div class="box">
        <div class="box-header">
            <h3 class="box-title pull-left">IMEI Goods In</h3>
            <span class="pull-right">Total: <b class="total_pending_items_count"></b></span>
        </div>
        <!-- /.box-header -->
        <div class="box-body">
        <!-- datatable begins-->
            <div class="custom_datatable">
                <div class="table-wrapper" style="padding:5px;">
                <table class="table table-striped table-hover" style="font-size:15px;">
                    <thead>
                    <tr>
                        <th>P.ID</th>
                        <th>Date</th>
                        <th>Supplier</th>
                        <th>QC?</th>
                        <th>Priority</th>
                        <th>Qty</th>
                    </tr>
                    </thead>
                    <tbody>
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
				<!-- Buttons for actions -->
				<div class="col-md-12">
				<!-- Export to CSV Button -->
				<a href="?export_csv=true" class="btn btn-success">Export to CSV</a>
 
				</div>
			</div>
            <!-- /.box-body -->
        </div>
        <!-- /.box -->


