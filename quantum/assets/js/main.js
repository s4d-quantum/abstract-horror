// importing and exposing jquery as global object
import $ from "jquery";
window.jQuery = $;
window.$ = $;

// dependencies
require("./jquery-ui.min");
require("./bootstrap.min");
require("./lodash.min");

// plugins
require("./chart.min");
require("./dataTables.bootstrap.min");
require("./jquery-barcode.min");
require("./bootstrap-datepicker");
require("./select2.min");
require("./tableExport");
require("./chart.min");
require("./jquery.table2excel.min");
require("./notify.min");

// Custom
require("./app");
// require('./dashboard'); moment issue
require("./demo");
