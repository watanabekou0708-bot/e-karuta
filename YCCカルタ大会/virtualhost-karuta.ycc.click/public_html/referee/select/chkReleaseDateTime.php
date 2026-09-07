<?php

    // 払出予約のチェック

    require_once($_SERVER['DOCUMENT_ROOT'].'/inc/dbConnect.php');

    $ret = array('STATUS' => 'NG', 'ACCESS' => 'Failure');

    $sql = "UPDATE `tReturnTable` SET `reserveDevice` = '', `releaseDateTime` = '0000-00-00 00:00:00' WHERE  `releaseDateTime` > '0000-00-00 00:00:00' AND `releaseDateTime` <= NOW()";
    if($result = mysqli_query($db, $sql)) {
        $ret['STATUS'] = 'OK';
        $ret['ACCESS'] = $deviceName;
        mysqli_free_result($result);
    } else {
        $ret['ACCESS'] = '1.クエリが実行できませんでした。';
    }

    echo json_encode($ret);

    mysqli_close($db);
