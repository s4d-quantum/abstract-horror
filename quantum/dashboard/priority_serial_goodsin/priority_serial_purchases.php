<?php $global_url="../../../"; ?>

<div class="box">
        <div class="box-header">
            <h3 class="box-title pull-left">Serial Goods In</h3>
            <span class="pull-right">Total: <b class="serial_total_pending_items_count"></b></span>
        </div>
        <!-- /.box-header -->
        <div class="box-body">
        <!-- datatable begins-->
            <div class="custom_datatable">
                <div class="table-wrapper" style="padding:5px;">
                <table class="serial-table table table-striped table-hover" style="font-size:15px;">
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
                <div class="serial-data-loading">processing</div>
                <div class="clearfix">
                    <div class="pagination-wrapper">
                    <div class="serial-prev-next-btn" data-value="previous"><a href="#" class="page-link">Previous</a></div>
                    <div class="imei-current-page-btn"><b>Page: <span class="current-page">1</span> of <span class="total-pages"></span></b></div>
                    <div class="serial-prev-next-btn" data-value="next"><a href="#" class="page-link">Next</a></div>
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

