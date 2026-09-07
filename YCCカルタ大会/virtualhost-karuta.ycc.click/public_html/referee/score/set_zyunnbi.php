<?php
    require_once($_SERVER['DOCUMENT_ROOT'].'/inc/dbConnect.php');
	
	$query = "UPDATE `tInfo` SET `zyunnbi`= 0";
	$result = mysqli_query($db,$query);

	mysqli_free_result($result);
	mysqli_close($db);
?>