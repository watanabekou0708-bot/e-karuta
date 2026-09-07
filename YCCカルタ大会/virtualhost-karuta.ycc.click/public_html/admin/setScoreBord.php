<?php

    require_once('../inc/dbConnect.php');

    $battle = $_REQUEST['battle'];
    $ret = array('STATUS' => 'NG', 'DATA' => '');

	$sql = "UPDATE `deviceInfo` SET `hostSendMSG` = '{$battle}' WHERE `deviceName` = 'Score'";

    if($result = mysqli_query($db, $sql)) {
        $ret['STATUS'] = 'OK';
        mysqli_free_result($result);
    } else {
        $ret['DATA'] = 'Failure';
    }

    echo json_encode($ret);

	mysqli_close($db);
