<?php include '../../../db_config.php';  ?>
<?php

if(isset($_POST['searchMODEL'])){
    $searchModel = mysqli_real_escape_string($conn, $_POST['searchMODEL']);
    $pageId = isset($_POST['pageId']) ? (($_POST['pageId'] -1) * 10 ) : 0;

    $fetch_items = mysqli_query($conn, 
    "SELECT 
    pr.purchase_id,
    pr.item_imei,
    pr.tray_id,
    pr.supplier_id,
    im.item_color,
    im.item_gb,
    im.item_grade,
    im.status,
    tc.item_details,
    tc.item_brand
    FROM tbl_imei AS im
    INNER JOIN tbl_tac AS tc ON im.item_tac = tc.item_tac 
    INNER JOIN tbl_purchases AS pr ON im.item_imei = pr.item_imei 
    WHERE tc.item_details = '$searchModel' 
    AND im.status = 1 
    ORDER BY pr.tray_id ASC, im.id DESC 
    LIMIT 10 OFFSET $pageId")
    or die('Error: '.mysqli_error($conn));

    $results_array = array();
    while ($row = mysqli_fetch_assoc($fetch_items)) {
        $results_array[] = $row;
    }

    print json_encode(array(
        "data" => $results_array,
        "total_rows" => mysqli_num_rows($fetch_items)
    ));
}
?>

