// User inactive state script started
var timeoutID;
function setup() {
  this.addEventListener("mousemove", resetTimer, false);
  this.addEventListener("mousedown", resetTimer, false);
  this.addEventListener("keypress", resetTimer, false);
  this.addEventListener("DOMMouseScroll", resetTimer, false);
  this.addEventListener("mousewheel", resetTimer, false);
  this.addEventListener("touchmove", resetTimer, false);
  this.addEventListener("MSPointerMove", resetTimer, false);

  console.log("page refresh");
  startTimer();
}
setup();

// on page refresh if user was inactive it will remain inactive
if (localStorage.getItem("userInActive") == "1") {
  goInactive();
}

function startTimer() {
  // wait 2 seconds before calling goInactive
  timeoutID = window.setTimeout(goInactive, 2147483647);
}

function resetTimer(e) {
  if (localStorage.getItem("userInActive") == "0") {
    window.clearTimeout(timeoutID);
    startTimer();
  }
}

function goInactive() {
  // do something
  localStorage.setItem("userInActive", "1");
  document.querySelector(".user-inactive-wrapper").style.display = "block";
}
