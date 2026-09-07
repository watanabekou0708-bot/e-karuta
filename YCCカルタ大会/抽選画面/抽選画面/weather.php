<?php
    ini_set('display_errors', '1');
    ini_set('date.timezone', 'Asia/Tokyo');

    // $url = 'http://api.openweathermap.org/data/2.5/weather?lat=34.161769&lon=131.46552&units=metric&APPID=07500588b7e531f39ba3f9f09a59bfba';
    $url = 'http://api.openweathermap.org/data/2.5/weather?q=Yamaguchi-shi,jp&units=metric&APPID=07500588b7e531f39ba3f9f09a59bfba';
    $weather = json_decode(file_get_contents($url), true);

    // サーバー内カレントディレクトリ取得(/home/hamada/public_html/weather/updateWeather)
    $currentDirectory = getcwd();

    // インターネットカレントURI取得(http(s)://157.7.221.68/~hamada/weather/updateWeather)
    $currentURI = (empty($_SERVER["HTTPS"]) ? "http://" : "https://").$_SERVER["HTTP_HOST"].rtrim(str_replace(basename($_SERVER["SCRIPT_NAME"]), "", $_SERVER['REQUEST_URI']), '/');

    $array = Array(
        'weather'     => $weather['weather'][0]['main'], // 天気
        'image'       => "http://openweathermap.org/img/w/{$weather['weather'][0]['icon']}.png", // アイコン
        'description' => $weather['weather'][0]['description'], // 天気詳細
        'high'        => $weather['main']['temp_max'], // 最高気温(units=metricを指定すれば摂氏)
        'low'         => $weather['main']['temp_min'], // 最低気温
        'updated_at'  => date("Y/m/d H:i:s"),
        'access_at'   => ""
    );

    if ($array["weather"] == "Clear"){
        $array["weather"] = "晴れ";
        $array["image"] = "{$currentURI}/weatherIcon/sun.svg";
    } else if ($array["weather"] == "Rain"){
        $array["weather"] = "雨";
        $array["image"] = "{$currentURI}/weatherIcon/rain.svg";
    } else if ($array["weather"] == "Clouds"){
        $array["weather"] = "曇り";
        $array["image"] = "{$currentURI}/weatherIcon/cloud.svg";
    }

	$array["access_at"] = date( "Y/m/d H:i:s" );

	echo json_encode($array);

/*
{
    "base": "stations",
    "clouds": {
        "all": 75
    },
    "cod": 200,
    "coord": {
        "lat": 34.19,
        "lon": 131.47
    },
    "dt": 1498806000,
    "id": 1848689,
    "main": {
        "humidity": 88,   // 湿度(%)
        "pressure": 1009,
        "temp": 26.38,    // 気温
        "temp_max": 29,   // 最高気温
        "temp_min": 25    // 最低気温
    },
    "name": "Yamaguchi-shi",
    "sys": {
        "country": "JP",
        "id": 7534,
        "message": 0.0074,
        "sunrise": 1498766736,
        "sunset": 1498818595,
        "type": 1
    },
    "visibility": 10000,
    "weather": [
        {
            "description": "broken clouds",
            "icon": "04d",  // http://openweathermap.org/img/w/04d.png
            "id": 803,
            "main": "Clouds"
        }
    ],
    "wind": {
        "deg": 60,    // 風向き
        "speed": 8.2  // 風速(メートル/秒)
    }
}
*/