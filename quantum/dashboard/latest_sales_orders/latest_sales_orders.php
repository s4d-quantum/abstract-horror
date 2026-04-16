<?php $global_url="../../../"; ?>

<div class="box">
    <div class="box-header">
        <h3 class="box-title pull-left">Latest Sales Orders</h3>
        <div class="pull-right" style="display:flex; align-items:center; gap:12px;">
            <div>
                Total: <b class="sales_total_orders_count"></b>
            </div>
        </div>
    </div>
    <!-- /.box-header -->
    <div class="box-body">
        <div class="custom_datatable">
            <div class="table-wrapper" style="padding:5px;">
                <table class="sales-orders-table table table-striped table-hover" style="font-size:15px;">
                    <thead>
                        <tr>
                            <th>Order ID</th>
                            <th>Date</th>
                            <th>Customer</th>
                            <th>PO Ref</th>
                            <th>Qty</th>
                        </tr>
                    </thead>
                    <tbody>
                    </tbody>
                </table>
                <div class="sales-orders-data-loading">processing</div>
                <div class="clearfix">
                    <div class="pagination-wrapper">
                        <div class="sales-orders-prev-next-btn" data-value="previous"><a href="#" class="page-link">Previous</a></div>
                        <div class="sales-orders-current-page"><b>Page: <span class="current-page">1</span> of <span class="total-pages"></span></b></div>
                        <div class="sales-orders-prev-next-btn" data-value="next"><a href="#" class="page-link">Next</a></div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
