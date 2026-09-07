<?php

    require_once($_SERVER['DOCUMENT_ROOT'].'/inc/dbConnect.php');

    $id = $_POST['id'];
    $table = $_POST['table'];
    $battle = $_POST['battle'];
    $name = $_POST['name'];
    $ret = array('STATUS' => 'NG', 'ACCESS' => 'Failure', 'HOST' => '', 'GUEST' => '');

	$sql = "UPDATE `tScore` SET `table` = '{$table}', `battle` = {$battle} WHERE `name` = '{$name}' AND `battle` = 0";
	$result = mysqli_query($db, $sql);

    $sql = "UPDATE `tReturnTable` SET `releaseDateTime` = '0000-00-00 00:00:00' WHERE `id` = '{$id}'";
    $result = mysqli_query($db, $sql);

	mysqli_free_result($result);
	mysqli_close($db);
