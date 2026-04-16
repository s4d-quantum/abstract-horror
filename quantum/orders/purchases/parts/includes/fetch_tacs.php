<?php include '../../../db_config.php';  ?>
<?php

    $brandId = $_POST['brandId'];
    $fetch_tac_query = mysqli_query($conn,"select item_tac, item_details from tbl_tac
    where item_brand = '".$brandId."'");
    $results_array = array();
    while ($row = mysqli_fetch_assoc($fetch_tac_query)) {
        $results_array[] = $row;
    }
    print json_encode($results_array);
