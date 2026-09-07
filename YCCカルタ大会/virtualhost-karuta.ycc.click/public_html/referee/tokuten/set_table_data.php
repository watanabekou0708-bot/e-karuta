<?php
    require_once($_SERVER['DOCUMENT_ROOT'].'/inc/dbConnect.php');

	foreach($_POST['data'] as $value){
		$query = "INSERT INTO `tReturnTable`(`data`) VALUES ('" . $value ."')";
		mysqli_query($db,$query);
	}

	$query = "UPDATE `tInfo` SET `zyunnbi`= 1,`battle`= 1";
	mysqli_query($db,$query);
	
	mysqli_close($db);
	
?>