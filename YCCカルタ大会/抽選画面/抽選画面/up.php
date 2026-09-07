<?php
    // $input_data = (int)$_POST['text1'];
    // $str = 'id=10';
    parse_str(file_get_contents('php://input'), $put_param);    // parse_str($str,$out);
    // parse_str(file_get_contents(), $put_param);    // parse_str($str,$out);
    // echo json_encode(file_get_contents('php://input'));
    echo json_encode($put_param);
    // var_dump($put_param);
    // echo $put_param;


// if ($input_data == 40){
//         echo ('正解です。おめでとうございます。');
// }else{
//         echo ('残念でした。もう一度チャンレンジして下さい。');

//         echo ('<p>');
//         echo ('問題：10×4＝');
//         echo ('</p>');

//         // print('<form method="POST" action="./kaitou2.php">');
//         // print('<input type="text" name="text1">');
//         // print('<input type="submit" name="btn1" value="回答">');
//         // print('</form>');
// }