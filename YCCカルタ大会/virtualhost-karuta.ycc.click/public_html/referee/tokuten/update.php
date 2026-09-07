<?php
    require_once($_SERVER['DOCUMENT_ROOT'].'/inc/dbConnect.php');
	
	$query = "UPDATE `tScore` SET `score`='" . $_POST['score'] . "',`otetuki`=" . $_POST['otetuki'] . " WHERE `name`='" . $_POST['name'] ."'";
	$result = mysqli_query($db,$query);

	mysqli_free_result($result);
	mysqli_close($db);
?>