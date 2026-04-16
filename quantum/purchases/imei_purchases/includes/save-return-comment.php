<?php include '../../../db_config.php';  ?>
<?php

    $comment = $_POST['comment'];
    $return_id = $_POST['returnId'];

    $save_comment = mysqli_query($conn,"update tbl_purchase_return set 
    report_comment='".$comment."' where return_id=".$return_id)
    or die('Error:: ' . mysqli_error($conn));
