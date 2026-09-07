<?php

    require_once($_SERVER['DOCUMENT_ROOT'].'/inc/dbConnect.php');

    $ret = array('STATUS' => 'NG', 'DATA' => '');

    $sql = "SELECT `isReady` FROM `tInfo`";

    if($result = mysqli_query($db, $sql)) {
        if(mysqli_num_rows($result) > 0) {
            $row = mysqli_fetch_array($result, MYSQLI_ASSOC);
            $ret['STATUS'] = 'OK';
            $ret['DATA'] = $row['isReady'];
        } else {
            $ret['DATA'] = 'Failure';
        }
        mysqli_free_result($result);
    }

	echo json_encode($ret);

	mysqli_close($db);
