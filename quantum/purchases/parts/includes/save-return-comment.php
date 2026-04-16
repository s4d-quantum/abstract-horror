<?php include '../../../db_config.php';  ?>
<?php

    $comment = $_POST['comment'];
    $purchase_id = $_POST['purchaseId'];

    $save_comment = mysqli_query($conn,"update tbl_parts_purchase_return set 
    report_comment='".$comment."' where return_id=".$purchase_id)
    or die('Error:: ' . mysqli_error($conn));
