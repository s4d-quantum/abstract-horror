// User inactive state script started
document.onload = function () {
  var timeoutID;

  function setInactiveError(message) {
    var errorEl = document.querySelector(".inactive-form-error");
    if (errorEl) {
      errorEl.textContent = message || "";
    }
  }

  function getGlobalUrl() {
    var scripts = document.getElementsByTagName("script");
    for (var i = scripts.length - 1; i >= 0; i--) {
      if (scripts[i].src && scripts[i].src.indexOf("loginModal.js") !== -1) {
        return scripts[i].src.replace(/assets\/js\/loginModal\.js(\?.*)?$/, "");
      }
    }
    return "";
  }

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
    console.log("already inactive");
    goInactive();
  }

  function startTimer() {
    // wait 2 seconds before calling goInactive
    timeoutID = window.setTimeout(goInactive, 900000);
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
    document.querySelector("body .user-inactive-wrapper").style.display =
      "block";
  }

  // User inactive state script ended
  var globalUrl = getGlobalUrl();
  var inactiveForm = document.querySelector(".user-inactive-wrapper form");
  var inactiveSubmitBtn = document.querySelector(".inactive_form_submit");

  if (!inactiveForm) {
    return;
  }

  inactiveForm.addEventListener("submit", function (e) {
    e.preventDefault();
    setInactiveError("");

    //  save user id to recognize if next login user is same or different
    var userIdEl = document.querySelector(".user-id");
    var userId = userIdEl ? userIdEl.textContent.trim() : "";
    localStorage.setItem("userId", userId);

    var emailInput = document.querySelector(".user_email");
    var passwordInput = document.querySelector(".user_password");
    if (!emailInput || !passwordInput) {
      setInactiveError("Missing login fields. Please refresh and try again.");
      return;
    }

    if (inactiveSubmitBtn) {
      inactiveSubmitBtn.disabled = true;
    }

    $.ajax({
      type: "POST",
      url: `${globalUrl}users/inactive_user_script.php`,
      dataType: "json",
      data: {
        email: emailInput.value,
        password: passwordInput.value,
      },
      success: function (data) {
        var response = data;
        if (typeof response === "string") {
          try {
            response = JSON.parse(response);
          } catch (err) {
            response = null;
          }
        }

        if (!response) {
          setInactiveError(
            "Unexpected response while signing in. Please try again."
          );
          return;
        }

        if (response.error) {
          setInactiveError(response.error);
          return;
        }

        var responseUserId =
          response.user_id !== null && response.user_id !== undefined
            ? String(response.user_id).trim()
            : "";

        if (!userId || !responseUserId) {
          setInactiveError("Sign in failed. Please try again.");
          return;
        }

        if (responseUserId !== userId) {
          setInactiveError(
            "This session belongs to a different user. Please log out and sign in again."
          );
          return;
        }

        window.clearTimeout(timeoutID);
        localStorage.setItem("userInActive", "0");
        var wrapper = document.querySelector(".user-inactive-wrapper");
        if (wrapper) {
          wrapper.style.display = "none";
        }
        startTimer();
      },
      error: function () {
        setInactiveError("Unable to sign in right now. Please try again.");
      },
      complete: function () {
        if (inactiveSubmitBtn) {
          inactiveSubmitBtn.disabled = false;
        }
      },
    });
  });
}; //window onload
