<?php

echo "helloworld";

    // Store items in array
//     $item_array= array();
//     for($i=0;$i < count($_POST['item_code']); $i++){
//       $item_array[] = array(
//         'Item Code' => "'".$_POST['item_code'][$i].".",
//         'Details'=> $_POST['item_details'][$i],
//         'Brand'=> $_POST['item_brand'][$i],
//         'Qty'=> $_POST['item_qty'][$i],
//       );
//     }

//   function ExportFile($records) {
//     $heading = false;
//     if(!empty($records)){
//       foreach($records as $row) {
//         if(!$heading) {
//           // display field/column names as a first row
//           echo implode("\t", array_keys($row)) . "\n";
//           $heading = true;
//         }
//         echo implode("\t", array_values($row)) . "\n";
//       }
//     }
//     exit;
//   }

//   // $filename = $_POST["ExportType"] . ".xls";		 
//     $filename = $get_customer['name']."_".$get_purchase_details['date'].".xls";		 
//     header("Content-Type: application/vnd.ms-excel");
//     header("Content-Disposition: attachment; filename=\"$filename\"");
//     ExportFile($item_array);
//     exit();
