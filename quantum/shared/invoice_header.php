<?php $global_url="../"; ?>
<?php include '../../db_config.php';  ?>
<?php include "../../authenticate.php" ?>

<?php 

$company_details_query = mysqli_query($conn, "select * from tbl_settings")
or die('Error: '.mysqli_error($conn)); 
$company_details = mysqli_fetch_assoc($company_details_query);

$company_title = $company_details['company_title'];
$address = strlen($company_details['address']) ?$company_details['address']:'';
$city = strlen($company_details['city'])?$company_details['city']:'';
$postcode = strlen($company_details['postcode'])?$company_details['postcode']:'';
$country = strlen($company_details['country'])?$company_details['country']:'';
$phone = strlen($company_details['phone'])?$company_details['phone']:'';
$email = strlen($company_details['email'])?$company_details['email']:'';
$vat = strlen($company_details['vat'])?"VAT Registration No: ".$company_details['vat']:'';
$eroi_no = strlen($company_details['eroi_no'])? "EROI No.: ".$company_details['eroi_no']:'';
$company_registration_no = strlen($company_details['company_registration_no'])? "Company Registration No.".$company_details['company_registration_no']:'';

// logo 
$logo = "../../assets/uploads/".$company_details['logo_image'];

function invoiceHeader($isCustomer, $get_customer, $order_id, $date_object, $pid){
   
  global $company_details, $company_title, $address, $address2, $city,$postcode, $country, $phone, $email, $vat, $eroi_no, $company_registration_no, $logo;
  echo "<table id='example1' class='table goodsout-table'>
        <thead>
          <tr>
            <td>
              <img src='".$logo."' style='display:block;width:110px;' />
            </td>
            <td>
            <div class='pull-right' style='line-height:10px; max-width:220px;'>
                  <p><b>".$company_title."</b> <br></p>
                  <p>".$address."</p>
                  <p>".$city.", ".$country."</p>
                  <p>".$postcode."</p>
                  <p>".$phone."</p>
                  <p>".$email."</p>
                  <p>".$vat."</p>
                  <p>".$eroi_no."</p>
                  <p>".$company_registration_no."</p>
                </div>
              </td>
            </tr>
            <tr>
              <td>
              <b>".($isCustomer ? 'Customer' : 'Supplier')."</b>
              <br>
              <span class='customer'>". $get_customer['name']."</span><br>
              ". (strlen($get_customer['address']) > 1 ? "<span>". $get_customer['address']."</span><br>":'')."
              ". (strlen($get_customer['address2']) > 1 ? "<span>". $get_customer['address2']."</span><br>":'')."
              ". (strlen($get_customer['city']) > 1 ? "<span> ". $get_customer['city']."</span>,":'')."
              ". (strlen($get_customer['country']) > 1 ? "<span> ". $get_customer['country']."</span><br>":'')."
              ". (strlen($get_customer['postcode']) > 1 ? "<span>". $get_customer['postcode']."</span><br>":'')."
              ". (strlen($get_customer['phone']) > 1 ? "<span>". $get_customer['phone']."</span><br>":'')."
              ". (strlen($get_customer['email']) > 1 ? "<span>". $get_customer['email']."</span><br>":'')."
              ". (strlen($get_customer['vat']) > 1 ? "VAT Registration No.:<span>". $get_customer['vat']."</span><br>":'')."
              <h4>".$pid."</h4>
            </td>
            <td>
              <div class='date pull-right' style='margin-right:95px;'>
                <b>Date :</b>
                <span class='date'>". $date_object['date']."</span>
              </div>
            </td>
          </tr>
          </thead>
          </table>";
          }