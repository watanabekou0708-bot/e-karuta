<?php

    require_once('../inc/dbConnect.php');

    $ret = array('STATUS' => 'NG', 'DATA' => '');

    $sql = "SELECT `scoreBord` FROM `tInfo`";
    $result = mysqli_query($db, $sql);
	$row = mysqli_fetch_array($result, MYSQLI_ASSOC);

	echo $row["scoreBord"];

	mysqli_free_result($result);
	mysqli_close($db);
