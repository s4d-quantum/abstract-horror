// date picker
$("#purchase_date").datepicker({
  autoclose: true,
  format: "yyyy/mm/dd",
});

$(".del_btn").on("click", function (e) {
  var userConfirm = confirm(
    "Are you sure you want to Delete this Purchase Record?"
  );
  if (userConfirm == false) {
    e.preventDefault();
  }
});

$(".item_tac").select2({
  tags: true,
});

// fetch tacs for pre-selected brand in edit form
let brand = document.querySelector("#edit_brand  .item_brand");
if (!!brand && !!brand.value) {
  selectBrandsItems(brand.value);
}

// Fetch TACs on change of brand
$(document).on("change", ".item_brand", selectBrandsItems);
function selectBrandsItems(brand) {
  let that = this;
  $.ajax({
    type: "POST",
    url: "includes/fetch_tacs.php",
    data: {
      brandId: brand.length ? brand : that.value,
    },
    success: function (data) {
      // first clear existing dropdown
      $(".item_tac").html("");

      let items = JSON.parse(data);

      // group all items with similar tac details
      let groupItems = items.reduce((groups, item) => {
        const group = groups[item.item_details.trim()] || [];
        group.push(item);
        groups[item.item_details.trim()] = group;
        return groups;
      }, {});

      // traverse each group and concat all item_tacs
      groupItems = Object.values(groupItems).map((item) => {
        let tacItem = {
          item_details: item[0].item_details,
          item_tac: "",
        };
        // concat all item tacs
        item.map((data) => {
          tacItem.item_tac += `${data.item_tac},`;
        });

        // remove last comma (which is of no use)
        tacItem["item_tac"] = tacItem.item_tac.slice(
          0,
          tacItem.item_tac.length - 1
        );

        return tacItem;
      });

      console.log(groupItems);
      console.log("=========");

      if (groupItems.length > 0) {
        groupItems.forEach((item) => {
          let title = item.item_details.trim();
          let code = item.item_tac.trim();

          // IF EDIT MODE (find if prev selected tacs matches so we make these tacs
          // highlighted by default
          let prevSelectedTacsWrapper = document.querySelector(
            ".prev-selected-tacs"
          );
          let prevSelectedTacs = prevSelectedTacsWrapper.innerHTML;
          let hasPrevSelectedTac = prevSelectedTacs.length ? true : false;
          if (prevSelectedTacs.length > 0) {
            // split both prevSelectedTacs and code into separate tacs and match both
            // incase if any tac matches
            prevSelectedTacs = code.split(",").filter((t) => {
              console.log(
                `${t} - ${prevSelectedTacs} => ${prevSelectedTacs
                  .split(",")
                  .includes(t)}`
              );
              return prevSelectedTacs.split(",").includes(t);
            });
          }

          // if title is not empty
          if (title.length) {
            $(".item_tac").append(
              `<option value="${code}" ${
                hasPrevSelectedTac && prevSelectedTacs.length > 0
                  ? "selected"
                  : ""
              }>${title}</option>`
            );
          }
        });
      }
    },
    error: function (data) {},
  });
}
