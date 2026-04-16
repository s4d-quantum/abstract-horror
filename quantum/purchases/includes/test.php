<?php include '../../db_config.php';  ?>
<?php

    // $loadedDataLength = $_POST['loaded_stock'];
    // $fetch_data_length_query = mysqli_query($conn,"select count(*) as total from tbl_imei");
    // $fetch_data_length = mysqli_fetch_assoc($fetch_data_length_query)['total'];

    // // echo $fetch_data_length.'<br>';
    // // echo $loadedDataLength.'<br>';
    
    // if($fetch_data_length > $loadedDataLength){
    //     $fetch_data = mysqli_query($conn,"select  
    //     tc.item_tac,im.item_imei,im.purchase_id,
    //     tc.item_details,tc.item_gb,tc.item_brand from tbl_tac as tc inner join tbl_imei 
    //     as im on tc.item_tac = im.item_tac");
    //     $results_array = array();
    //     while ($row = mysqli_fetch_assoc($fetch_data)) {
    //         $results_array[] = $row;
    //     }
    //     print json_encode($results_array);
    // }
    // else{
    //     echo 0; 
    // }

    // fetch TAC
    $fetch_tac_query = mysqli_query($conn,"select item_details,item_brand,item_gb from tbl_tac");
    // $fetch_tac = mysqli_fetch_assoc($fetch_tac_query);
    
    $results_array = array();
    while ($row = mysqli_fetch_assoc($fetch_tac_query)) {
        $results_array[] = $row;
    }
    print json_encode($results_array);

