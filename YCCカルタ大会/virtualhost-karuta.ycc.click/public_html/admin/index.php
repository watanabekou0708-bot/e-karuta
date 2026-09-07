<?php

    session_start();

    if(isset($_POST['deviceName']) || (isset($_SESSION['deviceName']) && isset($_SESSION['password']))) {

        require_once('../inc/dbConnect.php');

        if(isset($_SESSION['deviceName']) && isset($_SESSION['password'])) {
            $deviceName = $_SESSION['deviceName'];
            $password   = $_SESSION['password'];
        } else {
            $deviceName = mb_strtoupper($_POST['deviceName']); // すべてのアルファベットを大文字にして返す
            $password = mb_strtoupper($_POST['password']); // すべてのアルファベットを大文字にして返す
        }

        $sql = "SELECT deviceName FROM deviceInfo WHERE deviceName='{$deviceName}' AND password = '{$password}'";

        if($result = mysqli_query($db, $sql)) {

            if(mysqli_num_rows($result) > 0 && $deviceName == 'PC') {

                $_SESSION['deviceName'] = $deviceName;
                $_SESSION['password'] = $password;
                $row = mysqli_fetch_array($result, MYSQLI_ASSOC);
                include('main.html');

            } else {

                echo "ログイン失敗";

            }

            mysqli_free_result($result);
        }

        mysqli_close($db);

    } else {

        include('login.html');

    }
