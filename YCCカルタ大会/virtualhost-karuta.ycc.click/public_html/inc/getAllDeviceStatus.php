<?php

    session_start();

    require_once('dbConnect.php');

    $ret = array('STATUS' => 'NG', 'ACCESS' => '', 'HOST' => '', 'DATA' => '');

    $sql = "SELECT `deviceName`, `hostSendMSG`, `guestSendMSG` FROM `deviceInfo`";

    if($result = mysqli_query($db, $sql)) {
        if(mysqli_num_rows($result) > 0) {
            $ret['STATUS'] = 'OK';
            $ret['ACCESS'] = $_SESSION['deviceName'];
            $dataArray = array();
            $hostArray = array();
            while($row = mysqli_fetch_array($result, MYSQLI_ASSOC)) {
                $dataArray[$row['deviceName']] = $row['guestSendMSG'];
                $hostArray[$row['deviceName']] = $row['hostSendMSG'];
            }
            $ret['DATA'] = $dataArray;
            $ret['HOST'] = $hostArray;
        } else {
            $ret['DATA'] = 'Failure';
        }
        mysqli_free_result($result);
    }

    echo json_encode($ret);
/* http://www.ctrlshift.net/jsonprettyprinter/
{
    "ACCESS": null, 
    "DATA": {
        "A": "No Login", 
        "B": "No Login", 
        "C": "No Login", 
        "D": "No Login", 
        "E": "No Login", 
        "F": "No Login", 
        "G": "No Login", 
        "H": "No Login", 
        "PC": "", 
        "Screen": "第１回戦"
    }, 
    "HOST": {
        "A": "wait", 
        "B": "wait", 
        "C": "wait", 
        "D": "wait", 
        "E": "wait", 
        "F": "wait", 
        "G": "wait", 
        "H": "wait", 
        "PC": "", 
        "Screen": "1"
    }, 
    "STATUS": "OK"
}
*/

    mysqli_close($db);
