<?php

    session_start();

    require_once('../inc/dbConnect.php');

    $ret = array('STATUS' => 'NG', 'ACCESS' => 'Failure', 'HOST' => '', 'GUEST' => '');

    if(isset($_SESSION['deviceName'])) {

        $deviceName = $_REQUEST['deviceName'];
        $hostSendMSG = $_REQUEST['hostSendMSG'];

        if($deviceName == 'PC') {
            $sql = "UPDATE `deviceInfo` SET `hostSendMSG` = '{$hostSendMSG}' WHERE `deviceType` = 'Tablet'";
        } else {
            $sql = "UPDATE `deviceInfo` SET `hostSendMSG` = '{$hostSendMSG}' WHERE `deviceName` = '{$deviceName}'";
        }

        if($result = mysqli_query($db, $sql)) {
            $ret['STATUS'] = 'OK';
            $ret['ACCESS'] = $deviceName;
            mysqli_free_result($result);
        }

    } else {

        $ret['ACCESS'] = 'セッションが見つかりません。';

    }

    echo json_encode($ret);

	mysqli_close($db);
