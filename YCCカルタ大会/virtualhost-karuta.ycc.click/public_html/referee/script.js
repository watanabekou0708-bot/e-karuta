function login() {

    $.ajax({
        url:  "login.php",
        type: "POST",
        dataType: "json",
        data: {
            deviceName: $("#deviceName").val(),
            password: $("#password").val()
        }
    }).done(function(data) {
        if(data['STATUS'] == "OK") {
            sessionStorage.setItem("deviceName", data['ACCESS']);
            chkDeviceInfo();
        } else {
            alert("1.想定外エラー:" + data['ACCESS']);
        }
    }).fail(function(XMLHttpRequest, textStatus, errorThrown) {
        console.log("バグ発生！");
        console.log("Error:" + textStatus);
        console.log("Error:" + errorThrown.message);
    });

}