<?php
    require_once($_SERVER['DOCUMENT_ROOT'].'/inc/dbConnect.php');
	
	$result = mysqli_query($db,"DELETE FROM `tScore` WHERE `battle` = 0");

	mysqli_free_result($result);
	mysqli_close($db);
?>
