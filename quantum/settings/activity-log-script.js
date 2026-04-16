// show loading text by default
let dataLoading = document.querySelector(".data-loading");
dataLoading.style.display = "block";

// Datatable filters input
let searchUser = null;
let searchUserName = null;

// Global Table state
let tableState = {
  currentPage: 1,
  totalPages: undefined,
};

//Filter User menu
let users = document.querySelector(".search_user");
searchUser = users[0].value.trim();
searchUserName = users[0].dataset.name;

users.onchange = debounce(function () {
  searchUser = this.value.trim();

  // get the selected user name
  searchUserName = users.options[this.selectedIndex].dataset.name;

  fetchData(null);
}, 250);

// fetch total data rows
function totalDataPages() {
  $.ajax({
    type: "POST",
    url: "includes/fetch-logs-total-pages.php",
    data: {
      searchUser,
    },
    success: function (data) {
      data = JSON.parse(data);
      tableState.totalPages = Math.ceil(data.total_rows / 10);

      document.querySelector(".total-pages").innerHTML =
        tableState.totalPages === 0 ? 1 : tableState.totalPages;
    },
  }); //ajax ended
}

// fetch datatable data
function fetchData(pageId) {
  dataLoading.style.display = "block";
  //update current page
  tableState.currentPage = pageId ? pageId : 1;
  document.querySelector(".current-page-btn > b > span").innerHTML =
    tableState.currentPage;

  $.ajax({
    type: "POST",
    url: "includes/fetch_activity_log.php",
    data: {
      pageId,
      searchUser,
    },
    success: function (data) {
      data = JSON.parse(data);
      let rowsData = data.data;

      tableState.totalPages = Math.ceil(data.total_rows / 10);

      // hide loading
      dataLoading.style.display = "none";

      // calculate total pages
      totalDataPages();

      drawTableRow(rowsData);
    },
  }); //ajax ended
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
      let { date, subject, details, ref, user } = val;

      tr.innerHTML = `<tr>
            <td>${moment(date).format("lll")}</td>
            <td>${ref === null ? "-" : ref}</td>
            <td>${subject === null ? "-" : subject}</td>
            <td>${details === null ? "-" : details}</td>
            <td>${searchUserName}</td>
        </tr>`;
      tbody.appendChild(tr);
    });
  }
};

function debounce(func, wait, immediate) {
  var timeout;
  return function () {
    var context = this,
      args = arguments;
    var later = function () {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
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
