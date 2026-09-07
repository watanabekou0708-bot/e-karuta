<?php

    require_once($_SERVER['DOCUMENT_ROOT'].'/inc/dbConnect.php');

    $data = $_POST['data'];
    $ret = array('STATUS' => 'NG', 'DATA' => '');

    // テーブルを空にする
    $sql = "TRUNCATE TABLE `tReturnTable`";
    if($result = mysqli_query($db, $sql)) {
        mysqli_free_result($result);
        $sql = "";
        foreach($data as $value) {
            // 全配列の挿入クエリ作成
            if($sql == "") {
                $sql = "INSERT INTO `tReturnTable`(`data`) VALUES ('{$value}')";
            } else {
                $sql .= ",('{$value}')";
            }
        }
        if($result = mysqli_query($db, $sql)) {
            $ret['STATUS'] = 'OK';
            mysqli_free_result($result);
        } else {
            $ret['DATA'] = '1.クエリが実行できませんでした。:'.$sql;
        }
    } else {
        $ret['DATA'] = '2.クエリが実行できませんでした。:'.$sql;
    }

    echo json_encode($ret);

	mysqli_close($db);
