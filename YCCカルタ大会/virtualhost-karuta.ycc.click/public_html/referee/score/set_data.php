<?php
    require_once($_SERVER['DOCUMENT_ROOT'].'/inc/dbConnect.php');

	$query = "INSERT INTO `tScore`(`name`,`table`,`battle`,`score`,`otetuki`) VALUES ('" . $_POST['name'] ."','',0,0,0)";
	mysqli_query($db,$query);
	
	mysqli_close($db);
	
?>