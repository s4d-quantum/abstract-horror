(function () {
  // show loading text by default
  let dataLoadingSerial = document.querySelector(".serial-data-loading");
  (dataLoadingSerial.style.display = "block"),
    // Global Table state
    (tableState = {
      currentPage: 1,
      totalPages: undefined,
    });

  // fetch datatable data
  function fetchDataSerial(pageId, purchase_id) {
    dataLoadingSerial.style.display = "block";
    //update current page
    tableState.currentPage = pageId;
    document.querySelector(".imei-current-page-btn > b > span").innerHTML =
      pageId;

    $.ajax({
      type: "POST",
      url: "dashboard/priority_serial_goodsin/fetch_priority_data.php",
      data: {
        pageId,
      },
      success: function (data) {
        data = JSON.parse(data);
        let rowsData = data.data;
        tableState.totalPages = Math.ceil(data.total_rows / 10);
        document.querySelector(
          ".imei-current-page-btn .total-pages"
        ).innerHTML = tableState.totalPages === 0 ? 1 : tableState.totalPages;

        // hide loading
        dataLoadingSerial.style.display = "none";
        if (rowsData.length) drawTableRowSerial(rowsData);

        // count and show total pending items
        $(".serial_total_pending_items_count").html(data.total_rows);
      },
    }); //ajax ended
  } //fetchdataSerial ended

  fetchDataSerial(1); //run on page load

  // add data to table on every ajax call
  const drawTableRowSerial = function (rowsData) {
    let tbodySerial = document.querySelector(".serial-table > tbody");
    // create row for each data
    tbodySerial.innerHTML = "";
    rowsData.forEach((val) => {
      let tr = document.createElement("tr");
      let { pur_id, date, supplier, qc_required, priority, total } = val;

      // priority work
      let priorityColor = "";
      // console.log(priority)
      if (priority == 1) priorityColor = "bg-red";
      else if (priority == 2) priorityColor = "bg-orange";
      else if (priority == 3) priorityColor = "bg-green";
      else if (priority == 4) priorityColor = "bg-blue";
      else if (priority == 5) priorityColor = "bg-teal";

      tr.innerHTML = `<tr style="background:#dd4b39!important;">
            <td class="${priorityColor}">
                ${pur_id}
                <input type="text" value=${pur_id} class="purchase_id hide"/>
            </td>
            <td>${date}</td>
            <td>${supplier}</td>
            <td>${qc_required == 1 ? "Yes" : "No"}</td>
            <td>
            <div style="display:flex;">
                <b style="margin-right:10px;">${
                  priority != 0 && priority !== null ? priority : ""
                }</b>
            </div>   
            </td>
            <td>${total}</td>
            <td>
                <a href="purchases/serial_purchases/serial_purchase_details.php?pur_id=${pur_id}"
                    class="btn btn-sm btn-info">
                    <i class="fa fa-search"></i>
                </a>
                <a href="purchases/serial_purchases/edit_serial_purchase.php?pur_id=${pur_id}"
                    class="btn btn-sm btn-warning">
                    <i class = "fa fa-pencil"></i>
                </a>
            </td>
        </tr>`;
      tbodySerial.appendChild(tr);
    });
  };

  // assign click event on each page button
  let pageNumSerial = document.getElementsByClassName("page-item");
  for (let i = 0; i < pageNumSerial.length; i++) {
    pageNumSerial[i].addEventListener("click", function () {
      dataLoadingSerial.style.display = "block";
      fetchDataSerial(i + 1);
    });
  }

  // assign click event to prev next button
  let prevNextBtnSerial = document.getElementsByClassName(
    "serial-prev-next-btn"
  );
  for (let i = 0; i < prevNextBtnSerial.length; i++) {
    prevNextBtnSerial[i].addEventListener("click", function (e) {
      if (this.dataset.value === "next") {
        if (tableState.currentPage < tableState.totalPages)
          tableState.currentPage++;
        else return;
      } else if (this.dataset.value === "previous") {
        if (tableState.currentPage > 1) tableState.currentPage--;
        else return;
      }
      dataLoadingSerial.style.display = "block";
      fetchDataSerial(tableState.currentPage);
    });
  }
})();
