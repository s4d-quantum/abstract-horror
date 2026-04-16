// using async await 
async function fetchIMEIData(params) {
  const {
    customer,
    supplier,
    category,
    color,
    gb,
    grade,
    tray,
    fromDate,
    toDate,
    stockType,
    filterStatus,
    searchIMEI,
    searchMODEL,
  } = params;


  let result = await $.ajax({
      type: "POST",
      url: "./imei/includes/fetch-imei-inventory-data.php",
      data: {
        customer,
        supplier,
        category,
        color,
        gb,
        searchMODEL,
        grade,
        tray,
        fromDate,
        toDate,
        stockType
      }
    }); //ajax ended
    return result;

} //fetchdata ended
