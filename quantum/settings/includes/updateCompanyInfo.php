<?php include '../../db_config.php';  ?>
<?php include "../../authenticate.php" ?>

<?php

$path = '../../assets/uploads/'; // upload directory
$valid_file_formats = array("jpg", "png", "gif", "bmp","jpeg");
$is_image_changed = false;

if(isset($_POST) and $_SERVER['REQUEST_METHOD'] == "POST")
  {
      $name = $_FILES['fileToUpload']['name'];
      $size = $_FILES['fileToUpload']['size'];

    // image has been selected/changed there is file 
      if(strlen($name)) { 
          list($txt, $ext) = explode(".", $name);
          if(in_array($ext,$valid_file_formats)) {
              if(true) {
                  $image_name = time().'_'.$_SESSION['user_id'].".".$ext;
                  $tmp = $_FILES['fileToUpload']['tmp_name'];
              if(move_uploaded_file($tmp, $path.$image_name)){
                $is_image_changed = true;
              }
              else
                  echo json_encode(array('error'=>1, 'msg' => "Image Upload failed..!"));
              }
              else
                  echo json_encode(array('error'=>1, 'msg' => "Image file size maximum 1 MB..!"));
          }
          else
              echo json_encode(array('error'=>1, 'msg' => "Invalid file format..!"));
      }

    //   update DB 
      $save_data = mysqli_query($conn,"update tbl_settings set 
      dpd_user='".$_POST['dpd_user']."',
      dpd_pass='".$_POST['dpd_pass']."',
      email='".$_POST['email']."',
      company_title='".$_POST['title']."',
      postcode='".$_POST['postcode']."',
      phone='".$_POST['phone']."',
      vat='".$_POST['vat']."',
      eroi_no='".$_POST['eroi_no']."',
      company_registration_no='".$_POST['	company_registration_no']."',
      address='".$_POST['address']."',
      city='".$_POST['city']."',
      country='".$_POST['country']."'"
    );

    // if image is changed 
    if($is_image_changed){
        echo $image_name;
        $save_data = mysqli_query($conn,"update tbl_settings set 
        logo_image='".$image_name."'");
    }
    else{
        echo 'no';

    }



}
  
  // header("location:settings_menu.php");

// }