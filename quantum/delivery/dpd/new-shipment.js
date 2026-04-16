const login = "S4DTEST";
const password = "S4DTEST12345";
// fetch("https://api.dpdlocal.co.uk/user/?action=login", {
//   headers: new Headers({
//     Authorization: "Basic UzREVEVTVDpTNERURVNUMTIzNDU=",
//     "Content-Type": "application/json; charset=utf-8",
//   }),
//   credentials: "include",
//   mode: "cors",
//   method: "GET",
//   redirect: "follow",
// }).then((response) => {
//   if (!response.ok) throw new Error(response.status);
//   return response.json();
// });

var http = new XMLHttpRequest();
http.open(
  "post",
  "https://api.dpdlocal.co.uk/user/?action=login",
  false,
  login,
  password
);
http.send("");
if (http.status == 200) {
  alert("OK. You now established a session. You can navigate to the URL.");
} else {
  alert("⚠️ Authentication failed.");
}
