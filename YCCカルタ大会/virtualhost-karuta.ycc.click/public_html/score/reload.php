<?php

    require_once($_SERVER['DOCUMENT_ROOT'].'/inc/dbConnect.php');

    $ret = array('STATUS' => 'NG', 'ACCESS' => 'Failure', 'HOST' => '', 'GUEST' => '');

    // 表示する対戦回数取得
    $sql = "SELECT `hostSendMSG` FROM `deviceInfo` WHERE `deviceName` = 'Score'";
	$result = mysqli_query($db, $sql);
	$row = mysqli_fetch_array($result, MYSQLI_ASSOC);
	$msg = $row["hostSendMSG"];

    // 対戦回数から勝ち上がる人数を取得
    $sql = "SELECT `kati` FROM `tBattle` WHERE `battle` = {$msg}";
	$result = mysqli_query($db, $sql);
	$row = mysqli_fetch_array($result, MYSQLI_ASSOC);

	//何回戦目か
	$table  = array('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H');
	$count  = 1;
	$html   = array();
	$html[0] = $msg;
    $html[2] = $row["kati"];

	//A~Hまでのテーブル
	foreach($table as $value) {

		$sql = "SELECT * FROM `tScore` WHERE `table` LIKE '{$value}' AND `battle` = {$msg} ORDER BY `score` DESC, `otetuki` ASC";
		$result = mysqli_query($db, $sql);

		if(!$result) {
		    $ret['ACCESS'] = mysqli_error($db);
		    // break;
		}

		if($value === "A" || $value === "E") {
			$html[1] .= "<div id='team" . $count++ . "'>";
		}

$html[1] .= <<< EOF
			<div id='{$value}' class='team'>
				<table class="teamTable">
					<thead>
						<tr>
							<td>{$value}</td>
							<td>取得数</td>
							<td>お手つき</td>
						</tr>
					</thead>
					<tbody>
EOF;

		//テーブルの人数分
		while($row = mysqli_fetch_array($result, MYSQLI_ASSOC)) {

			$score = (int)$row['score'] + (int)$row['otetuki'];
$html[1].= <<< EOF
					<tr>
						<td>{$row['name']}</td>
						<td>{$score}</td>
						<td>{$row['otetuki']}</td>
					</tr>
EOF;
		}

		$html[1] .= "</tbody>";
		$html[1] .= "</table>";
		$html[1] .= "</div>";

		if($value === "D" || $value === "H") {
			$html[1] .= "</div>";
		}
	    $ret['STATUS'] = 'OK';
	    $ret['HOST'] = $html;
	}

	echo json_encode($ret);

	mysqli_close($db);
