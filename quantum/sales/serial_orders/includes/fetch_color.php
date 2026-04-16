<?php include '../../../db_config.php';  ?>
<?php

    // BASIC QUERY
    $query = "select 
    distinct im.item_color, 
    im.item_gb, 
    im.item_grade 
    
    from tbl_imei as im inner join 
    tbl_tac as tc on tc.item_tac = im.item_tac where 
    tc.item_details='".$_POST['model']."'";

    $fetch_items = mysqli_query($conn,$query)
    or die('Error: '.mysqli_error($conn)); 

    $results_array = array();
    while ($row = mysqli_fetch_assoc($fetch_items)) {
        $results_array[] = $row;
    }

    print json_encode($results_array);