// show loading text by default
let dataLoading = document.querySelector(".data-loading");
(dataLoading.style.display = "block"),
  // Global Table state
  (tableState = {
    currentPage: 1,
    totalPages: undefined,
  });

// fetch suppliers
let suppliersList = [];
const fetchSuppliers = (callback) => {
  $.ajax({
    type: "POST",
    url: "includes/fetch_suppliers.php",
    success: function (data) {
      let D = JSON.parse(data);
      suppliersList = [...D];
      callback();
    },
    error: function (data) {},
  });
};

// fetch datatable data
function fetchData(pageId, return_id) {
  dataLoading.style.display = "block";
  // if search input and not pagination input
  if (arguments[0] === null) {
    $.ajax({
      type: "POST",
      url: "includes/fetch-purchase-return-history-data.php",
      data: {
        return_id,
      },
      success: function (data) {
        data = JSON.parse(data);
        let rowsData = data.data;
        console.log(data);

        // hide loading
        dataLoading.style.display = "none";
        if (rowsData.length) {
          fetchSuppliers(() => {
            // drawing table as callback after suppliers are fetched
            drawTableRow(rowsData);
          });
        }
        else{
          drawTableRow(rowsData);
        }
      },
    }); //ajax done
  } else {
    //update current page
    tableState.currentPage = pageId;
    document.querySelector(".current-page-btn > b > span").innerHTML = pageId;

    $.ajax({
      type: "POST",
      url: "includes/fetch-purchase-return-history-data.php",
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
        if (rowsData.length) {
          fetchSuppliers(() => {
            // drawing table as callback after suppliers are fetched
            drawTableRow(rowsData);
          });
        }
        else{
          drawTableRow(rowsData);
        }
      },
    }); //ajax ended
  } //else ended
} //fetchdata ended

fetchData(1); //run on page load

// add data to table on every ajax call
const drawTableRow = function (rowsData) {
  let tbody = document.getElementsByTagName("tbody")[0];
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
    let tr = document.createElement("tr");
    let { return_id, purchase_id, supplier_id, date, total } = val;
    let supplier = suppliersList.find((c) => {
      return c.supplier_id === supplier_id;
    }).name;

    tr.innerHTML = `<tr>
            <td>${return_id}</td>
            <td>${date}</td>
            <td>${supplier}</td>
            <td>
                <a href="serial_purchase_return_details.php?ret_id=${return_id}"
                    class="btn btn-primary">
                    <i class="fa fa-search"></i>
                </a>
            </td>
            <td>${total}</td>
        </tr>`;
      tbody.appendChild(tr);
    });
  }
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

//search datable
const searchInput = document.querySelector(".search-datatable");
searchInput.onkeyup = debounce(function() {
  if (this.value.length <= 0) {
    fetchData(tableState.currentPage);
  } else {
    fetchData(null, this.value.trim());
  }
}, 250);

function debounce(func, wait, immediate) {
	var timeout;
	return function() {
		var context = this, args = arguments;
		var later = function() {
			timeout = null;
			if (!immediate) func.apply(context, args);
		};
		var callNow = immediate && !timeout;
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
		if (callNow) func.apply(context, args);
	};
};

// confirm deleting item
$(document).on("click", ".del_btn", function (e) {
  const userConfirm = confirm("Are you sure you want to Delete it?");
  if (userConfirm == false) {
    e.preventDefault();
  }
});
