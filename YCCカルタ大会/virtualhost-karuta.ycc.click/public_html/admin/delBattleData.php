<?php

    require_once('../inc/dbConnect.php');

    $ret = array('STATUS' => 'NG', 'DATA' => '');

	$sql = "UPDATE `tScore` SET
		`table`   = NULL,
		`battle`  = 0,
		`score`   = 0,
		`otetuki` = 0";
	$result = mysqli_query($db, $sql);

	mysqli_free_result($result);
	mysqli_close($db);
