<?php
    require_once($_SERVER['DOCUMENT_ROOT'].'/inc/dbConnect.php');
	
	$query = "SELECT * FROM `tBattle` WHERE `tyuusenn`='" . $_POST["tyuusenn"] . "'";
	$result = mysqli_query($db,$query);

	$return_data="";
	while($row=mysqli_fetch_array($result,MYSQLI_ASSOC)){
		if($return_data==""){
			$return_data = $row["battle"] . "," . $row["table"] . "," . $row["table_ninnzuu"];
		}else{
			$return_data = $return_data . "," . $row["battle"] . "," . $row["table"] . "," . $row["table_ninnzuu"];
		}
	}

	echo $return_data;
	
	mysqli_free_result($result);
	mysqli_close($db);
?>