const imeiQc = document.querySelector(".imei_pending_qc");
$.ajax({
  type: "POST",
  url: "dashboard/qc_stats/includes/imei_qc_stats.php",
  data: {},
  success: function (data) {
    data = JSON.parse(data);
    imeiQc.innerHTML = data;
  },
});
