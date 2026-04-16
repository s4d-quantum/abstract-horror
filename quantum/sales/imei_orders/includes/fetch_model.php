<?php include '../../../db_config.php';  ?>
<?php

    // BASIC QUERY
    $query = "select 
    distinct tc.item_details
    from 
    tbl_tac as tc  inner join tbl_imei as im 
    on im.item_tac = tc.item_tac where 
    im.status = 1 and tc.item_brand = '".$_POST['category']."'";

    $fetch_items = mysqli_query($conn,$query)
    or die('Error: '.mysqli_error($conn)); 

    $results_array = array();
    while ($row = mysqli_fetch_assoc($fetch_items)) {
        $results_array[] = $row;
    }

    print json_encode($results_array);