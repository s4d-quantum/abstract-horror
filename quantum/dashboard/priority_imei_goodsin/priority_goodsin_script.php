window.onload = function () {
  // show loading text by default
  let dataLoading = document.querySelector(".data-loading");
  (dataLoading.style.display = "block"),
    // Global Table state
    (tableState = {
      currentPage: 1,
      totalPages: undefined,
    });

  // fetch datatable data
  function fetchData(pageId, purchase_id) {
    dataLoading.style.display = "block";
    //update current page
    tableState.currentPage = pageId;
    document.querySelector(".current-page-btn > b > span").innerHTML = pageId;

    $.ajax({
      type: "POST",
      url: "dashboard/priority_imei_goodsin/fetch_priority_data.php",
      data: {
        pageId,
      },
      success: function (data) {
        data = JSON.parse(data);
        let rowsData = data.data;
        tableState.totalPages = Math.ceil(data.total_rows / 10);
        document.querySelector(".total-pages").innerHTML =
          tableState.totalPages === 0 ? 1 : tableState.totalPages;

        // hide loading
        dataLoading.style.display = "none";
        if (rowsData.length) drawTableRow(rowsData);

        // count and show total pending items
        $(".total_pending_items_count").html(data.total_rows);
      },
    }); //ajax ended
  } //fetchdata ended

  fetchData(1); //run on page load

  // add data to table on every ajax call
  const drawTableRow = function (rowsData) {
    let tbody = document.getElementsByTagName("tbody")[0];
    // create row for each data
    tbody.innerHTML = "";
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
                <a href="purchases/imei_purchases/purchase_details.php?pur_id=${pur_id}"
                    class="btn btn-sm btn-info">
                    <i class="fa fa-search"></i>
                </a>
                <a href="purchases/imei_purchases/edit_purchase.php?pur_id=${pur_id}"
                    class="btn btn-sm btn-warning">
                    <i class = "fa fa-pencil"></i>
                </a>
            </td>
        </tr>`;
      tbody.appendChild(tr);
    });
  };

  // assign click event on each page button
  let pageNum = document.getElementsByClassName("page-item");
  for (let i = 0; i < pageNum.length; i++) {
    pageNum[i].addEventListener("click", function () {
      dataLoading.style.display = "block";
      fetchData(i + 1);
    });
  }

  // assign click event to prev next button
  let prevNextBtn = document.getElementsByClassName("prev-next-btn");
  for (let i = 0; i < prevNextBtn.length; i++) {
    prevNextBtn[i].addEventListener("click", function (e) {
      if (this.dataset.value === "next") {
        if (tableState.currentPage < tableState.totalPages)
          tableState.currentPage++;
        else return;
      } else if (this.dataset.value === "previous") {
        if (tableState.currentPage > 1) tableState.currentPage--;
        else return;
      }
      dataLoading.style.display = "block";
      fetchData(tableState.currentPage);
    });
  }
};
