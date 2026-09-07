<?php
    require_once($_SERVER['DOCUMENT_ROOT'].'/inc/dbConnect.php');
	
	$query = "SELECT * FROM `tBattle` WHERE `battle` = " . $_POST["battle"];
	$result = mysqli_query($db,$query);
	$row=mysqli_fetch_array($result,MYSQLI_ASSOC);

	$result2 = mysqli_query($db,"SELECT * FROM tInfo");
	$row2=mysqli_fetch_array($result,MYSQLI_ASSOC);

	$suuzi = $row2["count"] + 1;
	$query3 = "UPDATE `tInfo` SET `count`= " . $suuzi;
	mysqli_query($db,$query);

	echo $row["kati"];
	
	mysqli_free_result($result);
	mysqli_close($db);
?>