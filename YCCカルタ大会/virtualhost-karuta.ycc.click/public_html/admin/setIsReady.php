<?php

    require_once('../inc/dbConnect.php');

    $flg = $_POST['isReady'];
    $ret = array('STATUS' => 'NG', 'DATA' => '');

	$sql = "UPDATE `tInfo` SET `isReady` = {$flg}";
	$result = mysqli_query($db, $sql);

	mysqli_free_result($result);
	mysqli_close($db);
