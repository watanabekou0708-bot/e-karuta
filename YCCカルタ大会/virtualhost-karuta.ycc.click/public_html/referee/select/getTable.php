<?php

    require_once($_SERVER['DOCUMENT_ROOT'].'/inc/dbConnect.php');

    $deviceName = $_REQUEST['deviceName'];
    $ret = array('STATUS' => 'NG', 'ACCESS' => 'Failure', 'ID' => '', 'DATA' => '');
	$newReleaseDateTime = date("Y-m-d H:i:s",mktime(date("H"),date("i"),date("s")+30,date("m"),date("d"),date("Y")));

	// アクセスした端末の不正終了データの確認
	$sql = "SELECT `id`, `data` FROM `tReturnTable` WHERE `reserveDevice` = '{$deviceName}' AND `releaseDateTime` > '0000-00-00 00:00:00'";
    if($result = mysqli_query($db, $sql)) {
        if(mysqli_num_rows($result) > 0) {
        	// 不正終了データがある
            $row = mysqli_fetch_array($result, MYSQLI_ASSOC);
            $id = $row['id'];
            $ret['ID'] = $id;
            $ret['DATA'] = $row['data'];
	        mysqli_free_result($result);
			$sql = "UPDATE `tReturnTable` SET `releaseDateTime`='{$newReleaseDateTime}' WHERE `id` = '{$id}'";
		    if($result = mysqli_query($db, $sql)) {
	            $ret['STATUS'] = 'OK';
	            $ret['ACCESS'] = $deviceName;
		        mysqli_free_result($result);
		    } else {
		        $ret['ACCESS'] = '1.クエリが実行できませんでした。';
		    }
        } else {
        	// 不正終了データはない
			$sql = "SELECT `id`, `data` FROM `tReturnTable` WHERE `reserveDevice` = '' LIMIT 1";
		    if($result = mysqli_query($db, $sql)) {
		        if(mysqli_num_rows($result) > 0) {
		            $row = mysqli_fetch_array($result, MYSQLI_ASSOC);
		            $id = $row['id'];
		            $ret['ID'] = $id;
		            $ret['DATA'] = $row['data'];
			        mysqli_free_result($result);
					$sql = "UPDATE `tReturnTable` SET `reserveDevice` = '{$deviceName}', `releaseDateTime`='{$newReleaseDateTime}' WHERE `id` = '{$id}'";
				    if($result = mysqli_query($db, $sql)) {
			            $ret['STATUS'] = 'OK';
			            $ret['ACCESS'] = $deviceName;
				        mysqli_free_result($result);
				    } else {
				        $ret['ACCESS'] = '1.クエリが実行できませんでした。';
				    }
		        } else {
		            $ret['ACCESS'] = '抽選できるデータがありません。';
		        }
	        }
        }
        mysqli_free_result($result);
    } else {
        $ret['ACCESS'] = '2.クエリが実行できませんでした。';
    }

    echo json_encode($ret);

	mysqli_close($db);
