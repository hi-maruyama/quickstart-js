/**
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';


// Shortcuts to DOM Elements.
var messageForm = document.getElementById('message-form');
var messageInput = document.getElementById('new-post-message');
var titleInput = document.getElementById('new-post-title');
var signInButton = document.getElementById('sign-in-button');
var signOutButton = document.getElementById('sign-out-button');
var splashPage = document.getElementById('page-splash');
var addPost = document.getElementById('add-post');
var addButton = document.getElementById('add');
var recentPostsSection = document.getElementById('recent-posts-list');
var userPostsSection = document.getElementById('user-posts-list');
var topUserPostsSection = document.getElementById('top-user-posts-list');
// メニューバーボタン
var recentMenuButton = document.getElementById('menu-recent');
var myPostsMenuButton = document.getElementById('menu-my-posts');
var myTopPostsMenuButton = document.getElementById('menu-my-top-posts');

// firebaseリスナー格納用リスト
var listeningFirebaseRefs = [];

//
//  databaseへ新しいPOSTデータを保存する
//
function writeNewPost(uid, username, picture, title, body) {
  console.log('writeNewPost START', uid, username);

  // A post entry.
  var postData = {
    author: username,
    uid: uid,
    body: body,
    title: title,
    starCount: 0,
    authorPic: picture
  };

  // 先にデータ保存先のキーを取得する
  var newPostKey = firebase.database().ref().child('posts').push().key;

  // Write the new post's data simultaneously in the posts list and the user's post list.
  // ２箇所に同じデータを追加する
  var updates = {};
  updates['/posts/' + newPostKey] = postData;
  updates['/user-posts/' + uid + '/' + newPostKey] = postData;

  console.log('writeNewPost END');

  return firebase.database().ref().update(updates);
}

/**
 * Star/unstar post.
 */
// [START post_stars_transaction]
function toggleStar(postRef, uid) {
  console.log('toggleStar START');

  postRef.transaction(function(post) {
    console.log('postRef START');

    if (post) {
      console.log('post true');
      // 自分がこのPOSTにスターをつけているか確認する
      if (post.stars && post.stars[uid]) {
        // 自分がこのPOSTにスターをつけている場合

        // スターの合計数を−1する
        post.starCount--;
        // 自分uidのスターフラグを null にする。（キーが削除される　）
        //  stars-zvc:true
        //    ↓
        //  （starsも消える）
        post.stars[uid] = null;
      } else {
        // 自分がこのPOSTにスターをつけていない場合
        post.starCount++;
        // キー「starts」が存在するか確認する
        if (!post.stars) {
          // キー「starts」が存在しない場合
          // 空辞書でキー「starts」を作成するx
          post.stars = {};
        }
        // 自分uidをキーにして、スターフラグをONにする
        post.stars[uid] = true;
      }
    }
    console.log('postRef END');

    return post;
  });

  console.log('toggleStar END');
}
// [END post_stars_transaction]

//
//  POSTデータの<div>を新規作成する
//
function createPostElement(postId, title, text, author, authorId, authorPic) {
  console.log('createPostElement START');

  // Sign inしてるユーザーのユーザーIDを取得する
  var uid = firebase.auth().currentUser.uid;

  var html =
      '<div class="post post-' + postId + ' mdl-cell mdl-cell--12-col ' +
                  'mdl-cell--6-col-tablet mdl-cell--4-col-desktop mdl-grid mdl-grid--no-spacing">' +
        '<div class="mdl-card mdl-shadow--2dp">' +
          '<div class="mdl-card__title mdl-color--light-blue-600 mdl-color-text--white">' +
            '<h4 class="mdl-card__title-text"></h4>' +
          '</div>' +
          '<div class="header">' +
            '<div>' +
              '<div class="avatar"></div>' +
              '<div class="username mdl-color-text--black"></div>' +
            '</div>' +
          '</div>' +
          '<span class="star">' +
            '<div class="not-starred material-icons">star_border</div>' +
            '<div class="starred material-icons">star</div>' +
            '<div class="star-count">0</div>' +
          '</span>' +
          '<div class="text"></div>' +
          '<div class="comments-container"></div>' +
          '<form class="add-comment" action="#">' +
            '<div class="mdl-textfield mdl-js-textfield">' +
              '<input class="mdl-textfield__input new-comment" type="text">' +
              '<label class="mdl-textfield__label">Comment...</label>' +
            '</div>' +
          '</form>' +
        '</div>' +
      '</div>';

  // Create the DOM element from the HTML.
  var div = document.createElement('div');
  div.innerHTML = html;
  var postElement = div.firstChild;
  if (componentHandler) {
    componentHandler.upgradeElements(postElement.getElementsByClassName('mdl-textfield')[0]);
  }

  // コメント入力フィールド
  var addCommentForm = postElement.getElementsByClassName('add-comment')[0];
  var commentInput = postElement.getElementsByClassName('new-comment')[0];
  // 選択スター
  var star = postElement.getElementsByClassName('starred')[0];
  // 非選択スター
  var unStar = postElement.getElementsByClassName('not-starred')[0];

  // テキストをセットする
  postElement.getElementsByClassName('text')[0].innerText = text;
  // POSTのタイトルをセットする
  postElement.getElementsByClassName('mdl-card__title-text')[0].innerText = title;
  postElement.getElementsByClassName('username')[0].innerText = author || 'Anonymous';
  postElement.getElementsByClassName('avatar')[0].style.backgroundImage = 'url("' +
      (authorPic || './silhouette.jpg') + '")';

  // Listen for comments.
  // [START child_event_listener_recycler]
  var commentsRef = firebase.database().ref('post-comments/' + postId);
  commentsRef.on('child_added', function(data) {
    console.log('on(child_added)');
    // コメントの<div>を新規作成して表示する
    addCommentElement(postElement, data.key, data.val().text, data.val().author);
  });

  commentsRef.on('child_changed', function(data) {
    console.log('on(child_changed)');
    setCommentValues(postElement, data.key, data.val().text, data.val().author);
  });

  commentsRef.on('child_removed', function(data) {
    console.log('on(child_removed)');
    deleteComment(postElement, data.key);
  });
  // [END child_event_listener_recycler]

  var starCountRef = firebase.database().ref('posts/' + postId + '/starCount');
  starCountRef.on('value', function(snapshot) {
    // スターの数を更新する
    updateStarCount(postElement, snapshot.val());
  });

  // Listen for the starred status.
  var starredStatusRef = firebase.database().ref('posts/' + postId + '/stars/' + uid)
  starredStatusRef.on('value', function(snapshot) {
    // スターのデザインを変更する
    updateStarredByCurrentUser(postElement, snapshot.val());
  });

  // 監視するrealtimeDBの参照はグローバル変数へ格納しておく。（あとで解放できるように。)
  listeningFirebaseRefs.push(commentsRef);
  listeningFirebaseRefs.push(starCountRef);
  listeningFirebaseRefs.push(starredStatusRef);

  // Create new comment.
  addCommentForm.onsubmit = function(e) {
    console.log('コメント送信');
    e.preventDefault();
    createNewComment(postId, firebase.auth().currentUser.displayName, uid, commentInput.value);
    // テキストフィールドを空にする
    commentInput.value = '';
    commentInput.parentElement.MaterialTextfield.boundUpdateClassesHandler();
  };

  // スターのイベントハンドラー
  var onStarClicked = function() {
    var globalPostRef = firebase.database().ref('/posts/' + postId);
    var userPostRef = firebase.database().ref('/user-posts/' + authorId + '/' + postId);
    toggleStar(globalPostRef, uid);
    toggleStar(userPostRef, uid);
  };
  unStar.onclick = onStarClicked;
  star.onclick = onStarClicked;

  console.log('createPostElement END');

  return postElement;
}

//
//  コメントが入力されて実行された時のハンドラー
//
function createNewComment(postId, username, uid, text) {
  console.log('createNewComment START', postId, username, uid, text);

  // realtimeDBへコメントを追加する
  firebase.database().ref('post-comments/' + postId).push({
    text: text,
    author: username,
    uid: uid
  });
}

//
//  スターのデザインを変更する
//
function updateStarredByCurrentUser(postElement, starred) {
  console.log('updateStarredByCurrentUser START');

  if (starred) {
    postElement.getElementsByClassName('starred')[0].style.display = 'inline-block';
    postElement.getElementsByClassName('not-starred')[0].style.display = 'none';
  } else {
    postElement.getElementsByClassName('starred')[0].style.display = 'none';
    postElement.getElementsByClassName('not-starred')[0].style.display = 'inline-block';
  }
}

//
//  指定されたPOST<div>の星の数を更新する
//
function updateStarCount(postElement, nbStart) {
  console.log('updateStarCount START');

  postElement.getElementsByClassName('star-count')[0].innerText = nbStart;
}

//
//  コメントの<div>を新規作成して表示する
//
function addCommentElement(postElement, id, text, author) {
  console.log('addCommentElement START');

  var comment = document.createElement('div');
  comment.classList.add('comment-' + id);
  comment.innerHTML = '<span class="username"></span><span class="comment"></span>';
  comment.getElementsByClassName('comment')[0].innerText = text;
  comment.getElementsByClassName('username')[0].innerText = author || 'Anonymous';

  var commentsContainer = postElement.getElementsByClassName('comments-container')[0];
  commentsContainer.appendChild(comment);
}

/**
 * Sets the comment's values in the given postElement.
 */
function setCommentValues(postElement, id, text, author) {
  console.log('setCommentValues START', postElement, id, text, author);

  var comment = postElement.getElementsByClassName('comment-' + id)[0];
  comment.getElementsByClassName('comment')[0].innerText = text;
  comment.getElementsByClassName('fp-username')[0].innerText = author;
}

/**
 * Deletes the comment of the given ID in the given postElement.
 */
function deleteComment(postElement, id) {
  console.log('deleteComment START', postElement, id);

  var comment = postElement.getElementsByClassName('comment-' + id)[0];
  comment.parentElement.removeChild(comment);
}

/**
 * Starts listening for new posts and populates posts lists.
 */
function startDatabaseQueries() {
  console.log('startDatabaseQueries START');

  // Sign-inユーザーのユーザーIDを取得する
  var myUserId = firebase.auth().currentUser.uid;
  // readtimeDBのQueryオブジェクトを生成する
  var topUserPostsRef = firebase.database().ref('user-posts/' + myUserId).orderByChild('starCount');
  var recentPostsRef = firebase.database().ref('posts').limitToLast(100);
  var userPostsRef = firebase.database().ref('user-posts/' + myUserId);

  // databaseの値と要素を紐付ける
  //
  //  postsRef: firebase query 参照
  //  sectionElement: 投稿リスト用DOM
  var fetchPosts = function(postsRef, sectionElement) {

    postsRef.on('child_added', function(data) {
      // data: POSTデータ辞書
      // 初期化時と子要素追加時に発火する

      console.log('on(child_added,)');

      var author = data.val().author || 'Anonymous';
      // <section>配下にある クラス「posts-container」の<div>要素を取得する
      var containerElement = sectionElement.getElementsByClassName('posts-container')[0];

      // POSTデータを<div>に変換して子DOMの先頭に追加する
      containerElement.insertBefore(
        createPostElement(data.key, data.val().title, data.val().body, author, data.val().uid, data.val().authorPic),
        containerElement.firstChild
      );
    });

    postsRef.on('child_changed', function(data) {
      console.log('on(child_changed,)');

      var containerElement = sectionElement.getElementsByClassName('posts-container')[0];
      var postElement = containerElement.getElementsByClassName('post-' + data.key)[0];
      postElement.getElementsByClassName('mdl-card__title-text')[0].innerText = data.val().title;
      postElement.getElementsByClassName('username')[0].innerText = data.val().author;
      postElement.getElementsByClassName('text')[0].innerText = data.val().body;
      postElement.getElementsByClassName('star-count')[0].innerText = data.val().starCount;
    });

    postsRef.on('child_removed', function(data) {
      console.log('on(child_removed,)');

      var containerElement = sectionElement.getElementsByClassName('posts-container')[0];
      var post = containerElement.getElementsByClassName('post-' + data.key)[0];
      post.parentElement.removeChild(post);
    });

  };

  // 各セクションの全ての投稿を受診して、表示する
  fetchPosts(topUserPostsRef, topUserPostsSection);
  fetchPosts(recentPostsRef, recentPostsSection);
  fetchPosts(userPostsRef, userPostsSection);

  // Keep track of all Firebase refs we are listening to.
  listeningFirebaseRefs.push(topUserPostsRef);
  listeningFirebaseRefs.push(recentPostsRef);
  listeningFirebaseRefs.push(userPostsRef);

  console.log('startDatabaseQueries END');
}

//
//  realtimeDB へ ユーザーデータを保存する
//
function writeUserData(userId, name, email, imageUrl) {
  console.log('writeUserData START');

  firebase.database().ref('users/' + userId).set({
    username: name,
    email: email,
    profile_picture : imageUrl
  });

  console.log('writeUserData END');
}

/**
 * Cleanups the UI and removes all Firebase listeners.
 */
function cleanupUi() {
  console.log('cleanupUi START');

  // 表示している全ての投稿を削除する
  topUserPostsSection.getElementsByClassName('posts-container')[0].innerHTML = '';
  recentPostsSection.getElementsByClassName('posts-container')[0].innerHTML = '';
  userPostsSection.getElementsByClassName('posts-container')[0].innerHTML = '';

  // 全てのfirebaseリスナーを停止する
  listeningFirebaseRefs.forEach(function(ref) {
    // リスナーを解除する
    ref.off();
  });
  // 全てのリスナーを解放する
  listeningFirebaseRefs = [];

  console.log('cleanupUi END');
}

/**
 * The ID of the currently signed-in User. We keep track of this to detect Auth state change events that are just
 * programmatic token refresh but not a User status change.
 */
var currentUID;

/**
 * Triggers every time there is a change in the Firebase auth state (i.e. user signed-in or user signed out).
   ユーザーがSignin or Signout をした時のハンドラー
 */
function onAuthStateChanged(user) {
  console.log('onAuthStateChanged START user:', user);

  // We ignore token refresh events.
  if (user && currentUID === user.uid) {
    // Sign-in済みなら中断
    console.log('Sign in 済みのため中断する');
    return;
  }

  // UIを初期化する
  cleanupUi();

  if (user) {
    // Sign in 状態の場合

    // UserオブジェクトからユーザーIDを取得する
    currentUID = user.uid;
    console.log('currentUID:' + currentUID);

    // スプラッシュページを非表示にする
    splashPage.style.display = 'none';

    // realtimeDB へ ユーザーデータを保存する
    writeUserData(user.uid, user.displayName, user.email, user.photoURL);

    startDatabaseQueries();
  } else {
    // Sign out 状態の場合
    console.log('スプラッシュページを表示する');

    // Set currentUID to null.
    currentUID = null;
    // Display the splash page where you can sign-in.
    // Sign-inページを表示する
    splashPage.style.display = '';
  }

  console.log('onAuthStateChanged END');
}

//
//  新規POSTをdatabaseへ送信する
//
function newPostForCurrentUser(title, text) {
  console.log('newPostForCurrentUser START', title, text);

  var userId = firebase.auth().currentUser.uid;

  // Sign-inユーザーの情報を１回だけdatabaseから取得する
  return firebase.database().ref('/users/' + userId).once('value').then(function(snapshot) {
    // ユーザー名を取得する
    var username = (snapshot.val() && snapshot.val().username) || 'Anonymous';
    console.log('xxxxx');

    // databaseに新規POSTデータを保存する
    return writeNewPost(firebase.auth().currentUser.uid, username,
      firebase.auth().currentUser.photoURL,
      title, text
    );
  });
}

//
//  指定されたセクションを表示して、メニューを選択状態にする
//
//  sectionElement: <section> の DOM
//  buttonElement:
function showSection(sectionElement, buttonElement) {
  console.log('showSection START');

  // いったん全ての要素を非表示にする
  recentPostsSection.style.display = 'none';
  userPostsSection.style.display = 'none';
  topUserPostsSection.style.display = 'none';
  addPost.style.display = 'none';
  recentMenuButton.classList.remove('is-active');
  myPostsMenuButton.classList.remove('is-active');
  myTopPostsMenuButton.classList.remove('is-active');

  // 指定された要素を表示する
  if (sectionElement) {
    sectionElement.style.display = 'block';
  }
  // 指定された要素を表示する
  if (buttonElement) {
    buttonElement.classList.add('is-active');
  }

  console.log('showSection END');
}

// Bindings on load.
// ページ読み込み時に実行する
window.addEventListener('load', function() {
  console.log('load START');

  // SignInボタンハンドラー登録
  signInButton.addEventListener('click', function() {
    console.log('サインインボタンが押された');
    // Google サインインのポップアップを表示する
    var provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider);
  });

  // SignOutボタンハンドラー登録
  signOutButton.addEventListener('click', function() {
    console.log('サインアウト');
    firebase.auth().signOut();
  });

  // 認証ステータス変更の監視を開始する
  firebase.auth().onAuthStateChanged(onAuthStateChanged);

  // Submitハンドラー登録
  messageForm.onsubmit = function(e) {
    console.log('messageForm.onsubmit()');

    e.preventDefault();
    var text = messageInput.value;
    var title = titleInput.value;
    if (text && title) {
      //  新規POSTをdatabaseへ送信する
      newPostForCurrentUser(title, text).then(function() {
        // once('value').then() の完了を待ったあとで実行される？
        // それとも return writeNewPost(.. のあと？
        // とにかくdatabaseに新規POSTデータの保存が完了し、表示divの準備が完了したら呼ばれる

        // 「MY POSTS」メニューへ移動する
        myPostsMenuButton.click();
      });
      // 送信完了したので入力フォームを空にする
      messageInput.value = '';
      titleInput.value = '';
    }
  };

  // 最近ボタンのイベントハンドラー登録
  recentMenuButton.onclick = function() {
    console.log('recentMenuButton.onclick()');
    showSection(recentPostsSection, recentMenuButton);
  };

  // 自分投稿ボタンのイベントハンドラー登録
  myPostsMenuButton.onclick = function() {
    console.log('myPostsMenuButton.onclick()');
    showSection(userPostsSection, myPostsMenuButton);
  };

  // 自分TOP投稿ボタンのイベントハンドラー登録
  myTopPostsMenuButton.onclick = function() {
    console.log('myTopPostsMenuButton.onclick()');
    showSection(topUserPostsSection, myTopPostsMenuButton);
  };

  // 新規POSTボタン
  addButton.onclick = function() {
    console.log('addButton.onclick()');
    showSection(addPost);
    messageInput.value = '';
    titleInput.value = '';
  };

  // 最近ボタンのクリックを実行する。(最近メニューへ移動する)
  recentMenuButton.onclick();

  console.log('load END');

}, false);
