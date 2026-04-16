// Corrected priority_goodsin_script.js
window.onload = function () { let dataLoading = 
    document.querySelector(".data-loading"); dataLoading.style.display = 
    "block"; let tableState = {
        currentPage: 1, totalPages: undefined,
    };
    function fetchPriorityData(pageId = 1) { dataLoading.style.display = 
        "block"; tableState.currentPage = pageId; 
        document.querySelector(".current-page").innerText = pageId; 
        $.ajax({
            type: "POST", url: 
            "dashboard/priority_imei_goodsin/fetch_priority_data.php", 
            data: { pageId }, success: function (response) {
                let data = JSON.parse(response); tableState.totalPages = 
                Math.ceil(data.total_rows / 10); 
                document.querySelector(".total-pages").innerText = 
                tableState.totalPages || 1; dataLoading.style.display = 
                "none"; if (data.data.length) {
                    drawTableRow(data.data);
                }
                $(".total_pending_items_count").html(data.total_rows);
            },
            error: function () { dataLoading.style.display = "none"; 
                console.error("Failed to fetch data.");
            }
        });
    }
    function drawTableRow(rowsData) { let tbody = 
        document.getElementsByTagName("tbody")[0]; tbody.innerHTML = ""; 
        rowsData.forEach((val) => {
            let { purchase_id, date, name, qc_required, priority, total 
            } = val;
            let tr = document.createElement("tr"); let priorityColor = 
            ""; if (priority == 1) priorityColor = "bg-red"; else if 
            (priority == 2) priorityColor = "bg-orange"; else if 
            (priority == 3) priorityColor = "bg-green"; else if 
            (priority == 4) priorityColor = "bg-blue"; else if (priority 
            == 5) priorityColor = "bg-teal"; tr.innerHTML = `
                <td class="${priorityColor}"> ${purchase_id} <input 
                    type="text" value="${purchase_id}" 
                    class="purchase_id hide"/>
                </td> <td>${date}</td> <td>${name}</td> 
                <td>${qc_required == 1 ? "Yes" : "No"}</td> <td>
                    <div style="display:flex;"> <b 
                        style="margin-right:10px;">
                            ${priority !== 0 && priority !== null ? 
                            priority : ""}
                        </b> </div> </td> <td>${total}</td> `; 
            tbody.appendChild(tr);
        });
    }
    fetchPriorityData(1); let prevNextBtn = 
    document.getElementsByClassName("prev-next-btn"); for (let i = 0; i 
    < prevNextBtn.length; i++) {
        prevNextBtn[i].addEventListener("click", function () { if 
            (this.dataset.value === "next") {
                if (tableState.currentPage < tableState.totalPages) 
                tableState.currentPage++; else return;
            } else if (this.dataset.value === "previous") {
                if (tableState.currentPage > 1) 
                tableState.currentPage--; else return;
            }
            fetchPriorityData(tableState.currentPage);
        });
    }
};
