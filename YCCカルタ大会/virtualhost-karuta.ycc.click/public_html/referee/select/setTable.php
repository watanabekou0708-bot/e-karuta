<?php

    // リザーブキャンセル

    require_once($_SERVER['DOCUMENT_ROOT'].'/inc/dbConnect.php');

    $id = $_POST['id'];
    $ret = array('STATUS' => 'NG', 'ACCESS' => 'Failure', 'HOST' => '', 'GUEST' => '');

    $sql = "UPDATE `tReturnTable` SET `reserveDevice` = '', `releaseDateTime` = '0000-00-00 00:00:00' WHERE `id` = '{$id}'";
	$result = mysqli_query($db, $sql);

	mysqli_free_result($result);
	mysqli_close($db);
