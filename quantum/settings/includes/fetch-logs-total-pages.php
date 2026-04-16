<?php include '../../db_config.php';  ?>
<?php

    $searchUser = isset($_POST['searchUser']) && $_POST['searchUser']  != '' ?  $_POST['searchUser']:NULL;

    mysqli_select_db($conn, 's4d_user_accounts');                    

    $query = "
        select
        count(ur.user_name) as total

        from tbl_log as lg 
        inner join tbl_accounts as ur 
        on ur.user_id = lg.user_id ";

        // USE WHERE CLAUSE ONLY WHEN CONDITION 
        $query .= (
            !is_null($searchUser)
        ) ? " where lg.id > 0 ":"";
        
        // SEARCH INPUT
        $query .= !is_null($searchUser) ? " AND lg.user_id ='".$searchUser."' " : "";

    mysqli_select_db($conn, $_SESSION['user_db']);                    
        
    $fetch_total_rows_count = mysqli_query($conn, $query)
        or die('Error: '.mysqli_error($conn)); 

    $total_rows_count = mysqli_fetch_assoc($fetch_total_rows_count)['total'];

    print json_encode(array(
        'query' => $query,
        'total_rows' => $total_rows_count
    ));