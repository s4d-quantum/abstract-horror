<?php include '../../db_config.php';  ?>
<?php

    $searchUser = isset($_POST['searchUser']) && $_POST['searchUser']  != '' ?  $_POST['searchUser']:NULL;

    if(isset($_POST['pageId'])){
        $pageId = ($_POST['pageId'] > 1 ) ? (($_POST['pageId'] -1) * 10 ) : 0;
    }

    $query = "
    select
    lg.user_id,
    lg.subject,
    lg.auto_time as date,
    lg.details,
    lg.ref,
    lg.item_code

    from tbl_log as lg 
    where lg.id > 0 ";   
    
    
    // SEARCH INPUT
    $query .= !is_null($searchUser) ? " AND lg.user_id ='".$searchUser."' " : "";

    $query .= "ORDER BY lg.id DESC
    LIMIT 10 OFFSET ".$pageId;

    $fetch_items = mysqli_query($conn, $query)
    or die('Error: '.mysqli_error($conn)); 

    $results_array = array();
    while ($row = mysqli_fetch_assoc($fetch_items)) {
        $results_array[] = $row;
    }

    print json_encode(array(
        'query'=>$searchUser,
        'data' => $results_array
    ));