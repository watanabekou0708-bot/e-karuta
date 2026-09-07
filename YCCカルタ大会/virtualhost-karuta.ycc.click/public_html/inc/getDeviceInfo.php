<?php

    session_start();

    require_once('dbConnect.php');

    $ret = array('STATUS' => 'NG', 'ACCESS' => 'Failure', 'HOST' => '', 'GUEST' => '');

    if(isset($_SESSION['deviceName'])) {

        $deviceName = $_SESSION['deviceName'];

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
        }

    } else {

        $ret['ACCESS'] = 'セッションが見つかりません。';

    }

    echo json_encode($ret);
/* http://www.ctrlshift.net/jsonprettyprinter/
{
    "ACCESS": "A",
    "STATUS": "OK",
    "HOST": "wait",
    "GUEST": "No Login"
}
*/

    mysqli_close($db);
