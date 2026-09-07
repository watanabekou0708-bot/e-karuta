//グローバル変数
var number_m = document.getElementById('number');
var name_m = document.getElementById('name');
var group_m = document.getElementById('group');

//グループナンバーを取得
function getGroupNo(){
    var adGroupNo = document.getElementById('groupNo');
    fetch('test.json')
    .then(response => {
        return response.json();
    })
    .then(main =>{
        console.log(main);
        var getNo =  main[0].groupNo;
        adGroupNo.innerHTML = getNo;
        adGroupNo.setAttribute("data-No",getNo); // グループ番号を取得して data-Noに値を付与
    });
}

//学籍番号を入力し、次へのボタンを押されたら noPost関数が起動
/* json send data
    "group" : "1-A",
    "value" : "216018",
*/
/* return json

    name : "矢部祐人"  表示する名前
    value : "216018"  学籍番号

*/
function noPost(){
    var dataNo = document.getElementById('groupNo').getAttribute('data-No'); //付与した値から　データを取得
    var targetData = document.getElementById('value');
    /*送るデータの配列を作成*/
    var array = new Array();
    array['group'] = dataNo;
    array['value'] = targetData.value;
    array['name'] = '矢部祐人'; //testで挿入 実装時は削除
 　　　//fetch ↓のURLを、実装するphp名に変更
    fetch('up.php', {
        method: 'POST',
        body: urlParams(array)
    }).then(function(response) {
        return response.json();
    }).then(function(json) {
        console.log(json);
        name_m.innerHTML = json.name;
        number_m.innerHTML = dataNo;
        group_m.innerHTML = json.group;
    });
}
// モーダルの"はい"を押されたらaddPost関数が起動

/* json send data

    "group" : "1-A",
    "value" : "216018",
    "registration" : "true"

*/
function addPost(){
    var dataNo = document.getElementById('groupNo').getAttribute('data-No');
    var targetData = document.getElementById('value');
    /*送るデータの配列を作成*/
    var array = new Array();
    array['group'] = dataNo; //グループの番号
    array['value'] = targetData.value; // 学籍番号
    array['registration'] = 'true'; //登録フラグ
    //fetch ↓のURLを、実装するphp名に変更
    fetch('up.php', {
        method: 'POST',
        body: urlParams(array)
    }).then(function(response) {
        return response.json();
    }).then(function(json) {
        console.log(json);
    });
}
// データをURL方式にエンコード
function urlParams(data){
    var params = new URLSearchParams();
    for(var i in data){
        params.append(i,data[i]);
    }
    return params;
}























// /*getNameにajaxGetで設定したsetNameの名前を入力すると、その結果を出力する。*/
// function outPut(getName){
//     return JSON.parse(sessionStorage.getItem(getName));
// }
// /*setNameにoutPutでデータを取りたいときに使用する名前を設定 targetUrlには取得しにいきたいURLを設定*/
// function ajaxGet(setName,targetUrl){
//     fetch(targetUrl)
//     .then(response => {
//         return response.json();
//     })
//     .then(main => {
//         main[0].
//     });

// }


// // function ajaxGet(setName,targetUrl){
// //     fetch(targetUrl)
// //     .then(response => {
// //         return response.json();
// //     })
// //     .then(main => {
// //         sessionStorage.setItem(setName,JSON.stringify(main));
// //         // return main;
// //     });

// // }



// /**/
// function file_upload(){
//     ajaxPost('test','http://localhost/request_twitter/up.php');
// }


// /*======================以下開発中======================*/
// function outPutTextAria(getName){
//     var data = JSON.parse(sessionStorage.getItem(getname));
//     for(var i = 0; i < data.length; i++){

//     }
// }














// // function file_upload(){
// //     console.log('ファイルアップロードイン！');
// //     // ajaxPost('test','up.php');
// //     // var obj = new Array();
// //     // obj['id'] = 8;
// //     // obj['name'] = 'huga';
// //     // console.log(obj);
// //     fetch('up.php', {
// //         method: 'POST',
// //         body: urlParams({id:8,name:'huga'})
// //     }).then(function(response) {
// //         return response.json();
// //     }).then(function(json) {
// //         console.log(json);
// //     });

// // }