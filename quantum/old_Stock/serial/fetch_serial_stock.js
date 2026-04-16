
// fetch datatable data
async function fetchSerialData(param) {
  const {
    customer,
    supplier,
    category,
    grade,
    tray,
    fromDate,
    toDate,
    stockType,
    currentPage,
    filterStatus,
    searchSERIAL,
    searchMODEL,
  } = param;

  let result = await $.ajax({
      type: "POST",
      url: "./serial/includes/fetch-serial-inventory-data.php",
      data: {
        customer,
        supplier,
        category,
        searchMODEL,
        grade,
        tray,
        fromDate,
        toDate,
        stockType,
        pageId: currentPage,
      },
    }); //ajax ended

    return result;

} //fetchdata ended
