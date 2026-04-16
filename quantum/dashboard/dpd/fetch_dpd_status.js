let myHeaders = new Headers();

let dpdUser = document.querySelector(".dpd_u")?.value.trim();
let dpdPass = document.querySelector(".dpd_p")?.value.trim();

// fetch dpd tracking status
function fetchDPDStatus() {
  // all pending DPD Items
  let pendingDPDItems = [];
  // new chunked (max 10 items)
  let chunkedPendingDPDItems = [];

  // get all pending tracking ids
  const ddpItems = document.querySelectorAll(".pending-dpd-items > li");
  ddpItems.forEach((item) => {
    let trackingId = item.querySelector(".tracking-id").innerText.trim();
    let orderId = item.querySelector(".order-id").innerText.trim();

    // do check tracking id exists and no white spaces inbetween
    // and pendingDPDItems is not more then 10 items otherwise request will fail
    if (trackingId.length && trackingId.indexOf(" ") < 0) {
      pendingDPDItems.push({
        trackingId,
        orderId,
        status: 0,
      });
    }
  });

  // 1- break pendingItems array into chunks of max 10 array
  // 2 - run dpdFetchApi func once for each chunk (of max 10 items)
  breakIntoChunk(chunkedPendingDPDItems, pendingDPDItems);

  // 3 - iterate each chunkedPendingDPDItems array to fetch API
  // chunkedPendingDPDItems.map((pendingDPDItems) => {
  //   dpdFetchApi(pendingDPDItems);
  // });
  // multiple parcel calls fail thats why only fetching for first pair of dpd ids
  dpdFetchApi(chunkedPendingDPDItems[0]);
}

function breakIntoChunk(chunkedPendingDPDItems, items) {
  if (items.length > 10) {
    // add chunk of max 10 items in chunkedPendingDPDItems
    chunkedPendingDPDItems.push(items.slice(0, 10));
    // remove those 10 items from actual items array
    items.splice(0, 10);
    // re run to add remaining items to chunkedPendingDPDItems
    breakIntoChunk(items);
  } else {
    // add what ever (definitely less then 10) items to chunkedPendingDPDItems
    chunkedPendingDPDItems.push(items.slice());
  }
}

function dpdFetchApi(pendingItems = []) {
  // if there is no pending items then no API call
  if (!pendingItems.length) return;

  let raw = `
    <trackingrequest> 
        <user>${dpdUser}</user> 
        <password>${dpdPass}</password> 
        <trackingnumbers> 
        ${pendingItems
          .map((id) => `<trackingnumber>${id.trackingId}</trackingnumber>`)
          .join("")}
        </trackingnumbers>
    </trackingrequest>
    `;
  myHeaders.append("Content-Type", "application/xml");

  let requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: raw,
    redirect: "follow",
  };

  fetch("https://apps.geopostuk.com/trackingcore/ie/parcels", requestOptions)
    .then((response) => response.text())
    .then((response) => {
      parser = new DOMParser();
      xmlDoc = parser.parseFromString(response, "text/xml");
      let trackingDetails =
        xmlDoc.getElementsByTagName("trackingresponse")[0].childNodes[0];
      trackingDetails.childNodes.forEach((trackingDetail) => {
        // match pendingDPDItem tracking id with response tracking id
        pendingItems.forEach((item) => {
          if (item.trackingId === trackingDetail.childNodes[0].innerHTML) {
            // get status
            let status =
              trackingDetail.getElementsByTagName("trackingevents")[0];
            if (status) {
              status =
                status.childNodes[0].getElementsByTagName("type")[0].innerHTML;
            }

            // update status
            if (status === "DELIVERED") {
              item.status = 1;
            } else {
              item.status = 0;
            }
          }
        });
      });

      // update status for each item in DB which are of status 1
      pendingItems.map(
        (
          item // update state for each tracking id in DB
        ) => updateStateDB(item)
      );
    })
    .catch((error) => {
      console.log("error", error);
      //   $("#dpd-result").text("");
    });
}

// UPDATE FUNCTION TO UPDATE STATUS IN DB
function updateStateDB({ orderId, status, trackingId }) {
  $.ajax({
    type: "POST",
    url: `${getAbsoluteUrl()}/dashboard/dpd/update_dpd_status.php`,
    data: {
      order_id: orderId,
      status: status,
    },
    success: function (data) {
      console.log(data);
    },
    error: function (error) {
      console.log(error);
    },
  });
}

/*************
 find last dpd fetching status time 
 if its past an hour then refetch latest status of pending dpd items  
*************/
setInterval(() => {
  let currTime = moment();
  if (localStorage.getItem("dpdLastStatus")) {
    let prevTime = new moment(localStorage.getItem("dpdLastStatus"));
    let diff = currTime.diff(prevTime, "hours");
    if (diff >= 1) {
      // save new fetch time in localStorage
      localStorage.setItem("dpdLastStatus", currTime);
      fetchDPDStatus();
    }
  }
  // else if no prev fetch took place then fetch the status
  else {
    // save new fetch time in localStorage
    localStorage.setItem("dpdLastStatus", currTime);
    fetchDPDStatus();
  }
}, 60000);

// get absolute url for update_dpd_status.php file path
let getAbsoluteUrl = (function () {
  let a;
  return function (url) {
    if (!a) a = document.createElement("a");
    a.href = url;

    return a.href.includes("test-sales-module")
      ? "http://217.41.56.168/test-sale-module"
      : "http://217.41.56.168/";
  };
})();
