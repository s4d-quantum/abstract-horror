<?php include '../../../db_config.php';  ?>
<?php

    $comment = $_POST['comment'];
    $purchase_id = $_POST['purchaseId'];

    $save_comment = mysqli_query($conn,"update tbl_parts_purchases set 
    report_comment='".$comment."' where purchase_id=".$purchase_id)
    or die('Error:: ' . mysqli_error($conn));
