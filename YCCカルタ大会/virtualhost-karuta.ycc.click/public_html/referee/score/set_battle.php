<?php
    require_once($_SERVER['DOCUMENT_ROOT'].'/inc/dbConnect.php');
	
	$result = mysqli_query($db,"SELECT * FROM tInfo");

	$row=mysqli_fetch_array($result,MYSQLI_ASSOC);

	if($row["battle"]==$_POST["battle"]){
		$query = "UPDATE `tInfo` SET `battle`=" . $row['battle'] + 1;
		$result = mysqli_query($db,$query);
		echo 1;
	}else{
		echo 0;
	}

	mysqli_free_result($result);
	mysqli_close($db);
?>