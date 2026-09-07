<?php

    define( 'DR', $_SERVER['DOCUMENT_ROOT']);

    $db = mysqli_connect("localhost", "wdc", "wdc@ycc", "karuta");
    mysqli_set_charset($db, "utf8");

?>