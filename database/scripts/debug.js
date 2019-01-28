"use strict";

document.write("<link rel='stylesheet' type='text/css' href='css/debug.css'>");
var logger;
document.addEventListener('DOMContentLoaded', function () {
  // $(function () {
  logger = function () {
    var buttonCount = 32,
        textview,
        code,
        eventName,
        div,
        debug;
    eventName = "mousedown";
    eventName = "touchstart";
    code = document.createElement("code");
    code.id = "codeview";
    textview = document.createElement("pre");
    textview.id = "textview";
    textview.appendChild(code);
    document.body.appendChild(textview); // div = document.createElement("div");
    // div.id = "jogi";
    // document.body.appendChild(div);
    // ボタン格納用コンテナ

    div = document.createElement("div");
    div.classList.add("buttons");

    for (var i = 0; i < buttonCount; i++) {
      var input = document.createElement("input");
      input.type = "button";
      input.value = "f" + String(i + 1); // input へイベントをセットする

      try {
        input.addEventListener(eventName, eval("f" + String(i + 1)));
      } catch (e) {// console.log(String(e));
      }

      div.appendChild(input);
    }

    document.body.appendChild(div);

    debug = function debug() {
      var args = Array.prototype.slice.call(arguments);
      var text;

      if (args.length == 1) {
        text = args[0];
      } else {
        text = args.join(", ");
      }

      try {
        console.log(String(text));
        code.textContent = code.textContent + '\n[' + new Date().toISOString().slice(11, 23) + '] ' + text;
      } catch (e) {
        console.log(String(e));
        code.textContent = code.textContent + '\n[' + new Date().toISOString().slice(11, 23) + '] ERROR!! ' + String(e);
      }

      textview.scrollTop = textview.scrollHeight;
    };

    return {
      debug: debug
    };
  }();
});
document.addEventListener('DOMContentLoaded', function () {
  try {
    var app = firebase.app();
    var features = ['auth', 'database', 'messaging', 'storage'].filter(function (feature) {
      typeof app[feature] === 'function';
    });
    console.log(features.join(', '));
  } catch (e) {
    console.error(e);
  }
}); ////////////////////////////////////////////////////////
//  RobotUtils
////////////////////////////////////////////////////////
// var RobotUtils = (function(self) {
//   console.log(self);
//   //
//   //  NAOqiモジュールを取得して処理を実行する
//   //
//   //  servicesCallback: NAOqiモジュール名を引き数に持つコールバック
//   //  errorCallback: 
//   self.onServices = function(servicesCallback, errorCallback) {
//     //QiSession接続を試みる
//     self.connect(function(session) {
//       // QiSession接続成功の場合
//       // 関数の引数として指定されたNAOqiモジュールの文字列配列を取得する
//       var wantedServices = getParamNames(servicesCallback);
//       // 引数として渡されたNAOqiモジュールの数を取得する
//       var pendingServices = wantedServices.length;
//       // 空配列を初期化する 
//       var services = new Array(wantedServices.length);
//       var i;
//       // 引数として指定されたNAOqiモジュールの数だけループする
//       for (i = 0; i < wantedServices.length; i++) {
//         (function(i) {
//           // 指定されたNAOqiモジュールのインスタンス取得を試みる
//           session.service(wantedServices[i]).then(function(service) {
//             // NAOqiモジュールのインスタンスの取得に成功した場合
//             logger.debug('モジュール取得成功:' + String(wantedServices[i]))
//             // RobotUtils.ALMemory の書式でアクセスできるように保持する 
//             if (!(wantedServices[i] in self)) {
//               self[wantedServices[i]] = service;
//             }
//             // 指定された全モジュールが取得できたら成功コールバックを実行する
//             services[i] = service;
//             pendingServices -= 1;
//             if (pendingServices == 0) {
//               servicesCallback.apply(undefined, services);
//             }
//           }).catch(function(e) {
//             // NAOqiモジュールのインスタンスの取得に失敗した場合
//             var reason = "取得失敗 NaoQi Module: " + wantedServices[i]
//             logger.debug(reason);
//             // エラーコールバックを実行する
//             if (errorCallback) {
//               errorCallback(reason);
//             }
//           });
//         })(i);
//       }
//     }, errorCallback);
//   }
//   self.onService = self.onServices;
//   function MemoryEventSubscription() {
//     this.__proto__.constructor.list = [];
//   }
//   MemoryEventSubscription.prototype.push = function(sub, eventKey, id) {
//     this.__proto__.constructor.list.push({
//       "sub": sub,
//       "eventKey": eventKey,
//       "id": id,
//     })
//     console.log(this.__proto__.constructor.list.length)
//   }
//   MemoryEventSubscription.prototype.allRemove = function() {
//     for (var i = this.__proto__.constructor.list.length - 1; i >= 0; i--) {
//       var sub = this.__proto__.constructor.list[i]["sub"];
//       var id = this.__proto__.constructor.list[i]["id"];
//       sub.signal.disconnect(id)
//     }
//   }
//   self.ALMemoryManager = new MemoryEventSubscription();
//   self.subscribeToALMemoryEvent = function(eventKey, eventCallback) {
//     self.onService(function(ALMemory) {
//       // signalオブジェクトをプロパティに持つオブジェクトを取得する
//       ALMemory.subscriber(eventKey).then(function(sub) {
//         // signalオブジェクトをプロパティに持つオブジェクトの取得に成功した場合
//         // コールバック関数を登録する
//         sub.signal.connect(eventCallback).then(function(id) {
//           // コールバック関数の登録に成功した場合
//           self.ALMemoryManager.push(sub, eventKey, id);
//         });
//       }).catch(function(e) {
//         // signalオブジェクトをプロパティに持つオブジェクトの取得に失敗した場合
//         logger.debug('error:' + String(e))
//       });
//     });
//   }
//   //
//   //  QiSessionの接続を試みる
//   //
//   //  connectedCallback: 接続成功コールバック
//   //  failureCallback: 接続失敗コールバック
//   self.connect = function(connectedCallback, failureCallback) {
//     // すでにQiSession接続が完了済みか確認する
//     if (self.session) {
//       // すでにQiSessionを作成済みの場合
//       // 成功コールバックを実行して処理を中断する
//       connectedCallback(self.session);
//       return;
//     } else if (pendingConnectionCallbacks.length > 0) {
//       // 今まさにQiSessionと接続中なので、成功コールバックをセットだけする
//       pendingConnectionCallbacks.push(connectedCallback);
//       return;
//     } else {
//       // 成功コールバックをセットして、後続のQiSession接続を試みる
//       pendingConnectionCallbacks.push(connectedCallback);
//     }
//     var qimAddress = null;
//     var robotlibs = '/libs/';
//     if (self.robotIp) {
//       // Special case: we're doing remote debugging on a robot.
//       robotlibs = "http://" + self.robotIp + "/libs/";
//       qimAddress = self.robotIp + ":80";
//     }
//     //  QiSession接続完了コールバック
//     function onConnected(session) {
//       logger.debug('QiSession 接続成功')
//       // セッションを保持する
//       self.session = session;
//       // 待機中コールバック数を取得する
//       var numCallbacks = pendingConnectionCallbacks.length;
//       // 順番にコールバックを実行する
//       for (var i = 0; i < numCallbacks; i++) {
//         pendingConnectionCallbacks[i](session);
//       }
//     }
//     logger.debug(robotlibs + 'qimessaging/2/qimessaging.js');
//     // <script>を読み込んでQiSessionと接続する
//     getScript(robotlibs + 'qimessaging/2/qimessaging.js', function() {
//       // <script>読み込み完了コールバック
//       logger.debug('qimessaging.js 読み込み成功')
//       // QiSessionと接続を試みる
//       QiSession(
//         onConnected,
//         failureCallback,
//         qimAddress
//       );
//     }, function() {
//       // <script>読み込み失敗コールバック
//       logger.debug("<script>読み込み失敗")
//       if (self.robotIp) {
//         console.error("Failed to get qimessaging.js from robot: " + self.robotIp);
//       } else {
//         console.error("Failed to get qimessaging.js from this domain; host this app on a robot or add a ?robot=MY-ROBOT-IP to the URL.");
//       }
//       // 失敗コールバックを実行する
//       failureCallback();
//     });
//   }
//   //
//   //  パブリック変数
//   //
//   self.robotIp = _getRobotIp();
//   self.session = null;
//   //
//   //  <script>要素を先頭に追加して非同期に読み込む
//   //
//   //  source: JSファイルのパス
//   //  successCallback: 読み込み成功コールバック
//   //  failureCallback: 読み込み失敗コールバック
//   function getScript(source, successCallback, failureCallback) {
//     // <script>要素を新規作成する
//     var script = document.createElement('script');
//     // 既存のDOMから先頭の<script>要素を抽出する
//     var prior = document.getElementsByTagName('script')[0];
//     // 非同期フラグをONにする
//     script.async = 1;
//     // 先頭の<script>に追加する
//     prior.parentNode.insertBefore(script, prior);
//     // 読み込み処理完了コールバックをセットする
//     script.onload = script.onreadystatechange = script.onerror = function(_, isAbort) {
//       if (isAbort || !script.readyState || /loaded|complete/.test(script.readyState)) {
//         // 解放する
//         script.onload = script.onreadystatechange = null;
//         script = undefined;
//         if (isAbort) {
//           // 失敗した場合
//           if (failureCallback) failureCallback();
//         } else {
//           // 成功した場合
//           if (successCallback) successCallback();
//         }
//       }
//     };
//     // 読み込みエラーコールバックをセットする
//     script.onerror = (e, a) => {
//       logger.debug('script error:' + e.target.src);
//     }
//     // 読み込みを開始する
//     script.src = source;
//   }
//   self.getScript = getScript;
//   //
//   //  タブレットからPepperへアクセスする時のIPアドレスを取得する
//   //
//   function _getRobotIp() {
//     return location.host;
//   }
//   //
//   //  関数オブジェクトから引数名の文字列の配列を作成する
//   //  e.g. function f1(a, b){} -> ["a", "b"]
//   //
//   var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
//   function getParamNames(func) {
//     // 関数を文字に変換してコメント文を削除する
//     var fnStr = func.toString().replace(STRIP_COMMENTS, '');
//     // 関数の()内を抽出し、空白と「,」で分割して引数名文字列の配列を作成する
//     var result = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(/([^\s,]+)/g);
//     if (result === null) {
//       // 引数がない場合
//       // 空の配列を返す
//       result = [];
//     }
//     return result;
//   };
//   var pendingConnectionCallbacks = [];
//   return self;
// })(window.RobotUtils || {});
// ////////////////////////////////////////////////////////
// //  app
// ////////////////////////////////////////////////////////
// var app = (function(self) {
//   self.robot = null;
//   self.data = {
//     'timestamp': 0
//   };
//   self.onDataSignalId
//   //
//   //  サービスインスタンスを取得する
//   //
//   self.loadService = function(ALMemoryKey, successCallback) {
//     // ALMemoryインスタンス取得する
//     RobotUtils.onServices(function(ALMemory) {
//       // ALMemoryインスタンスの取得に成功した場合
//       // ALMemoryからサービス名文字列を取得する
//       ALMemory.getData(ALMemoryKey).then(function(v) {
//         // ALMemoryからサービス名文字列の取得に成功した場合
//         logger.debug('サービス名:' + String(v))
//         // サービスのインスタンスを取得する
//         RobotUtils.session.service(v).then(function(robot) {
//           // サービスのインスタンスの取得に成功した場合
//           logger.debug('サービス取得成功:' + String(robot))
//           // インスタンスを保持する
//           app.robot = robot;
//           // 成功コールバックを実行する
//           successCallback(robot);
//         }).catch(function(e) {
//           // サービスのインスタンスの取得に失敗した場合
//           logger.debug('サービス取得失敗 error:' + String(e))
//         });
//       }).catch(function(e) {
//         // ALMemoryからサービス名文字列の取得に失敗した場合
//         logger.debug('error:' + String(e))
//       });
//     }, function(e) {
//       // ALMemoryインスタンスの取得に失敗した場合
//       logger.debug("ALMemory取得失敗 e:" + String(e));
//     })
//   }
//   //
//   //  dataプロパティ用コールバック
//   //
//   self.onDataChanged = function(_data) {
//     logger.debug(_data['timestamp'])
//   }
//   return self;
// })(window.app || {});
// ////////////////////////////////////////////////////////
// //  loads
// ////////////////////////////////////////////////////////
// document.addEventListener('DOMContentLoaded', function() {
//   FastClick.attach(document.getElementsByTagName('input')[1]);
//   // サービスインスタンスを取得する
//   app.loadService("Near/ServiceName", function(robot) {
//     // サービスインスタンスの取得に成功した場合
//     app.robot = robot;
//     // dataのコールバックをセットする
//     robot.data.connect(app.onDataChanged).then(function(link) {
//       // dataのコールバックのセットに成功した場合
//       app.onDataSignalId = link;
//       // タブレット側の準備完了をPepperへ通知する
//       robot.onTabletReady().then(function(v) {
//         // 成功した場合
//         logger.debug('onTabletReady:' + String(v))
//       }).catch(function(e) {
//         // 失敗した場合
//         logger.debug('onTabletReady e:' + String(e))
//       });
//     }).catch(function(e) {
//       // dataのコールバックのセットに失敗した場合
//       logger.debug("data e:" + String(e))
//     });
//   });
//   app.util.loadWebView('https://near12.com/', function(){
//     console.log('ok');
//   }, function() {
//     console.log('error');
//   });
// });

function f1() {}

function f2() {}

function f3() {}

function f4() {}

function f5() {}

function f6() {}

function f7() {}