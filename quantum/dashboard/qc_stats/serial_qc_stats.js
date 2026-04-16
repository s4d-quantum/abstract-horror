const serialQc = document.querySelector(".serial_pending_qc");
$.ajax({
  type: "POST",
  url: "dashboard/qc_stats/includes/serial_qc_stats.php",
  data: {},
  success: function (data) {
    data = JSON.parse(data);
    serialQc.innerHTML = data;
  },
});
