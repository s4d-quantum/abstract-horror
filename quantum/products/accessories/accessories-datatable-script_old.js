// show loading text by default
let dataLoading = document.querySelector(".data-loading");
dataLoading.style.display = "block";

// Global Table state
let tableState = {
  currentPage: 1,
  totalPages: undefined,

  searchMODEL: "",
};

//important: Brands (this allow us to convert brand id from db to brand title)
let brandsList = document.querySelectorAll(".brand-list > span"),
  brands = [];
for (let i = 0; i < brandsList.length; i++) {
  let content = brandsList[i].innerHTML;
  brands.push({
    id: content.slice(content.indexOf("-") + 1, content.length),
    title: content.slice(0, content.indexOf("-")),
  });
}

// fetch datatable data
function fetchData(pageId) {
  let { searchMODEL } = tableState;
  // if search input and not pagination input
  if (arguments[0] === null) {
    $.ajax({
      type: "POST",
      url: "includes/fetch-accessories-data.php",
      data: {
        searchMODEL,
      },
      success: function (data) {
        data = JSON.parse(data);
        let rowsData = data.data;
        console.log(data);

        // hide loading
        dataLoading.style.display = "none";
        drawTableRow(rowsData);
      },
    }); //ajax done
  } else {
    //update current page
    tableState.currentPage = pageId;
    document.querySelector(".current-page-btn > b > span").innerHTML = pageId;

    $.ajax({
      type: "POST",
      url: "includes/fetch-accessories-data.php",
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
        drawTableRow(rowsData);
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
  if (!rowsData.length) {
    let tr = document.createElement("tr");
    tr.innerHTML = `<tr style="background:#dd4b39!important;">
      <td colspan="7">
        <h4 class="text-center">No Data! :(</h4>
      </td>
    </tr>`;
    tbody.appendChild(tr);
  } else {
    rowsData.forEach((val) => {
      let tr = document.createElement("tr");
      let { title, item_brand, item_qty, item_code } = val;

      /* category */
      let category = "";
      if (val.item_brand.length > 0)
        category = brands.filter((item) => item.id === item_brand)[0].title;
      else category = "";

      tr.innerHTML = `<tr>
            <td style="min-width:270px;">
                <a href="item_details.php?item_code=${item_code}" target="_blank">${title}</a>
            </td>
            <td>${category}</td>
            <td>${item_qty}</td>
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
searchInput.onkeyup = function (e) {
  if (searchInput.value.length === 0) {
    alert("Invalid item ID!!!!");
  } else {
    tableState.searchMODEL = e.target.value;
    fetchData(null);
  }
};
