<?php include '../../../db_config.php';  ?>
<?php

    $fetch_query = mysqli_query($conn,"select distinct tracking_no, delivery_company from 
    tbl_purchase_return where return_id=".$_POST['return_id']." ")
    or die('Error:: ' . mysqli_error($conn));

    $data = mysqli_fetch_assoc($fetch_query);
 
    print json_encode($data);