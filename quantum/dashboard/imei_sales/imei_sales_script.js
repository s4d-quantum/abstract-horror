(function () {

    // show loading text by default
    let dataLoading = document.querySelector('.sales_orders > .data-loading');
    dataLoading.style.display = 'block',

        // Global Table state
        tableState = {
            currentPage: 1,
            totalPages: undefined
        };


    // fetch datatable data
    function fetchData(pageId, order_id) {
        dataLoading.style.display = "block";
      //update current page
        tableState.currentPage = pageId;
        document.querySelector('.sales_orders > .current-page-btn > b > span').innerHTML = pageId;

        $.ajax({
            'type': "POST",
            'url': "dashboard/imei_sales/fetch_sales_data.php",
            'data': {
                pageId
            },
            'success': function (data) {
                data = JSON.parse(data);
                let rowsData = data.data;
                tableState.totalPages = Math.ceil(data.total_rows / 10);
                document.querySelector('.sales_orders > .total-pages').innerHTML = tableState.totalPages === 0 ? 1 : tableState.totalPages;

                // hide loading
                dataLoading.style.display = 'none';
                drawTableRow(rowsData);

                // count and show total pending items 
                $('.sales_orders > .total_pending_items_count').html(data.total_rows);
            }
        }); //ajax ended
    } //fetchdata ended

    fetchData(1); //run on page load

    // add data to table on every ajax call
    const drawTableRow = function (rowsData) {
        let tbody = document.querySelector('.sales_orders > tbody')[0];
        // create row for each data
  tbody.innerHTML = "";
  if(!rowsData.length){
    let tr = document.createElement("tr");
    tr.innerHTML = `<tr style="background:#dd4b39!important;">
      <td colspan="7">
        <h4 class="text-center">No Data! :(</h4>
      </td>
    </tr>`;
    tbody.appendChild(tr);
  }
  else {
  rowsData.forEach((val) => {
            let tr = document.createElement('tr');
            let {
                order_id,
                date,
                customer
            } = val;

            tr.innerHTML =
                `<tr style="background:#dd4b39!important;">
            <td>
                ${order_id}
                <input type="text" value=${order_id} class="order_id hide"/>
            </td>
            <td>${date}</td>
            <td>${customer}</td>
            <td>
                <a href="sales/imei_orders/edit_order.php?ord_id=${order_id}"
                    class="btn btn-warning btn-sm">
                    <i class = "fa fa-pencil"></i>
                </a>
            </td>
            <td>
            </td>
        </tr>`;
            tbody.appendChild(tr);
        })
    };

    // assign click event to prev next button
    let prevNextBtn = document.querySelector('.sales_orders > .prev-next-btn');
    for (let i = 0; i < prevNextBtn.length; i++) {
        prevNextBtn[i].addEventListener('click', function (e) {
            if (this.dataset.value === 'next') {
                if (tableState.currentPage < tableState.totalPages) tableState.currentPage++;
                else return;
            } else if (this.dataset.value === 'previous') {
                if (tableState.currentPage > 1) tableState.currentPage--;
                else return;
            }
            dataLoading.style.display = 'block';
            fetchData(tableState.currentPage);
        })
    }

})()
