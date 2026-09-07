<?php

    ini_set('display_errors', 1);
    require_once('../inc/dbConnect.php');

    $ret = array('STATUS' => 'NG', 'DATA' => '');

    // 抽選した人数を取得
    $sql = "SELECT `battle`, COUNT(`battle`) AS `count` FROM `tScore` GROUP BY `battle`";
	$result = mysqli_query($db, $sql);

    $html = Array('0' => 0, '1' => 0, '2' => 0, '3' => 0, '4' => 0, '5' => 0, '6' => 0);
	while($row = mysqli_fetch_array($result, MYSQLI_ASSOC)) {
        $html[$row['battle']] = $row['count'];
	}

    $ret['STATUS'] = 'OK';
    $ret['DATA'] = $html;

	echo json_encode($ret);

    mysqli_free_result($result);
	mysqli_close($db);
