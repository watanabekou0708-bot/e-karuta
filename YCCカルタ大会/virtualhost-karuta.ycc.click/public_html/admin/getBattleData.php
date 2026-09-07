<?php

    require_once('../inc/dbConnect.php');

	$lottery = $_REQUEST["lottery"];
    $ret = array('STATUS' => 'NG', 'DATA' => '');

	$sql = "SELECT * FROM `tBattle` WHERE `lottery` = '{$lottery}'";
	$result = mysqli_query($db, $sql);

	$ret = "";
	while($row = mysqli_fetch_array($result, MYSQLI_ASSOC)) {
		if($ret == "") {
			$ret =         "{$row['battle']},{$row['table']},{$row['table_ninnzuu']}";
		} else {
			$ret = $ret . ",{$row['battle']},{$row['table']},{$row['table_ninnzuu']}";
		}
	}

	echo $ret;

	mysqli_free_result($result);
	mysqli_close($db);
