<?php include '../../../db_config.php';  ?>
<?php


    $customers_query = mysqli_query($conn,"select name, customer_id from 
    tbl_customers")
    or die('Error:: ' . mysqli_error($conn));

    // $result = mysqli_fetch_assoc($fetch_data)
    $results_array = array();
    while ($row = mysqli_fetch_assoc($customers_query)) {
        $results_array[] = $row;
    }

    print json_encode($results_array);