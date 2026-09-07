<?php

    require_once($_SERVER['DOCUMENT_ROOT'].'/inc/dbConnect.php');

    $ret = array('STATUS' => 'NG', 'ACCESS' => 'Failure', 'HOST' => '', 'GUEST' => '');

	$sql = "SELECT `name` FROM `tScore` WHERE `isActive` = 1 AND `battle` = 0";
	$result = mysqli_query($db, $sql);

	$ret = "";
	while($row = mysqli_fetch_array($result, MYSQLI_ASSOC)) {
		if($ret == "") {
			$ret = $row["name"];
		} else {
			$ret = $ret . "," . $row["name"];
		}
	}

	echo $ret;

	mysqli_free_result($result);
	mysqli_close($db);
