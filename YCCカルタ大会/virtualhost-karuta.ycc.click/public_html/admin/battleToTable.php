<?php

    require_once('../inc/dbConnect.php');

    $ret = array('STATUS' => 'NG', 'DATA' => '');

    // 対戦回数から勝ち上がる人数を取得
    $sql = "SELECT * FROM battle";
	$result = mysqli_query($db, $sql);

$html = '';
	while($row = mysqli_fetch_array($result, MYSQLI_ASSOC)) {
$html .= <<< EOF
	<tr>
		<td>{$row['battle']}</td>
        <td>{$row['lottery']}</td>
		<td>{$row['level']}</td>
		<td>{$row['team']}</td>
        <td><span id="{$row['battle']}"></span>/{$row['member']}</td>
		<td>{($row['team'] * $row['member'])}</td>
		<td>{$row['winner']}</td>
	</tr>
EOF;
	}

    $ret['STATUS'] = 'OK';
    $ret['DATA'] = $html;

	echo json_encode($ret);

    mysqli_free_result($result);
	mysqli_close($db);
