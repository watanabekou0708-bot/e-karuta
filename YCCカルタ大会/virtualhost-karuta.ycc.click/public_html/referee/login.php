<?php

    require_once($_SERVER['DOCUMENT_ROOT'].'/inc/dbConnect.php');

    $deviceName = mb_strtoupper($_POST['deviceName']); // すべてのアルファベットを大文字にして返す
    $password = mb_strtoupper($_POST['password']); // すべてのアルファベットを大文字にして返す
    $ret = array('STATUS' => 'NG', 'ACCESS' => 'Failure', 'HOST' => '', 'GUEST' => '');

    $sql = "SELECT `deviceName`, `hostSendMSG`, `guestSendMSG` FROM `deviceInfo` WHERE `deviceName`='{$deviceName}' AND `password` = '{$password}'";

    if($result = mysqli_query($db, $sql)) {
        if(mysqli_num_rows($result) > 0 && $deviceName != 'PC' && $deviceName != 'Score') {
            $row = mysqli_fetch_array($result, MYSQLI_ASSOC);
            $ret['STATUS'] = 'OK';
            $ret['ACCESS'] = $deviceName;
            $ret['HOST'] = $row['hostSendMSG'];
            $ret['GUEST'] = $row['guestSendMSG'];
        } else {
            $ret['ACCESS'] = "ログイン失敗";
        }
        mysqli_free_result($result);
    } else {
        $ret['ACCESS'] = 'クエリが実行できませんでした。';
    }

    echo json_encode($ret);

    mysqli_close($db);
