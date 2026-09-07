<?php
    require_once($_SERVER['DOCUMENT_ROOT'].'/inc/dbConnect.php');
	
	$query = "SELECT * FROM `tScore` WHERE `table`='" . $_POST["table"] . "' AND `battle`='" . $_POST['battle'] . "'";
	$result = mysqli_query($db,$query);

	$return_data="";
	while($row=mysqli_fetch_array($result,MYSQLI_ASSOC)){
		if($return_data==""){
			$return_data = $row["name"] . "," . $row["score"] . "," .$row["otetuki"];
		}else{
			$return_data = $return_data . "," .$row["name"] . "," . $row["score"] . "," .$row["otetuki"];
		}
	}

	echo $return_data;
	
	mysqli_free_result($result);
	mysqli_close($db);
?>