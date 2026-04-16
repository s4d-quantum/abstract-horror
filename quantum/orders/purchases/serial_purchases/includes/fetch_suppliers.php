<?php include '../../../db_config.php';  ?>
<?php

    $suppliers_query = mysqli_query($conn,"select name, supplier_id from 
    tbl_suppliers")
    or die('Error:: ' . mysqli_error($conn));

    // $result = mysqli_fetch_assoc($fetch_data)
    $results_array = array();
    while ($row = mysqli_fetch_assoc($suppliers_query)) {
        $results_array[] = $row;
    }

    print json_encode($results_array);