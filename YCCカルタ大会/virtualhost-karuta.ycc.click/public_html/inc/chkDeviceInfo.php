<?php

    require_once($_SERVER['DOCUMENT_ROOT'].'/inc/dbConnect.php');

    $deviceName = $_POST['deviceName'];
    $ret = array('STATUS' => 'NG', 'ACCESS' => 'Failure', 'HOST' => '', 'GUEST' => '');

    $sql = "SELECT `hostSendMSG`, `guestSendMSG` FROM `deviceInfo` WHERE `deviceName` = '{$deviceName}'";
    if($result = mysqli_query($db, $sql)) {
        if(mysqli_num_rows($result) > 0) {
            $row = mysqli_fetch_array($result, MYSQLI_ASSOC);
            $ret['STATUS'] = 'OK';
            $ret['ACCESS'] = $deviceName;
            $ret['HOST'] = $row['hostSendMSG'];
            $ret['GUEST'] = $row['guestSendMSG'];
        }
        mysqli_free_result($result);
    } else {
        $ret['ACCESS'] = 'クエリが実行できませんでした。';
    }

    echo json_encode($ret);

	mysqli_close($db);
