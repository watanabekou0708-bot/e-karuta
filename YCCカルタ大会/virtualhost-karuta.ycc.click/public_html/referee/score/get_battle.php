<?php
    require_once($_SERVER['DOCUMENT_ROOT'].'/inc/dbConnect.php');
	
	$query = "SELECT * FROM `tBattle` WHERE `tyuusenn`='" . $_POST["tyuusenn"] . "'";
	$result = mysqli_query($db,$query);

	$battle = 0;
	while($row=mysqli_fetch_array($result,MYSQLI_ASSOC)){
		if($battle < $row["battle"]){
			$battle = $row["battle"];
		}
	}

	echo $battle;
	
	mysqli_free_result($result);
	mysqli_close($db);
?>