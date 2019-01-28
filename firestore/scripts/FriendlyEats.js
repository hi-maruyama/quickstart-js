/**
 * Copyright 2017 Google Inc. All Rights Reserved.
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

//
//  本FriendlyEatsアプリを初期化する
//
function FriendlyEats() {
  console.log('FriendlyEats start');
  
  // フィルター辞書を初期化する
  this.filters = {
    city: '',
    price: '',
    category: '',
    sort: 'Rating'
  };

  this.dialogs = {};

  var that = this;

  // Firestoreインスタンスをカスタムするための設定をする
  firebase.firestore().settings({
    // DateでなくTimestampの使用を強制する。# 将来的な標準になる
    timestampsInSnapshots: true
  });

  // 可能であれば永続的ストレージを有効にする
  firebase.firestore().enablePersistence()
    .then(function() {
      console.log('永続的ストレージの使用OK');
      console.log('匿名ユーザーとして非同期にサインインする');
      return firebase.auth().signInAnonymously();
    })
    .then(function() {
      // templatesクラスの要素を検出して保持する
      that.initTemplates();
      that.initRouter();
      that.initReviewDialog();
      that.initFilterDialog();
    }).catch(function(err) {
      // 永続的ストレージの使用がリジェクトされた
      console.log('ERROR: 永続的ストレージの使用がリジェクトされた');
      console.log(err);
    });

    console.log('FriendlyEats end');
}

//
//  このアプリのルーターを初期化する
//
FriendlyEats.prototype.initRouter = function() {
  console.log('initRouter start');

  // navigoを生成する
  this.router = new Navigo();

  var that = this;

  // ルーティングをセットする
  this.router
    .on({
      '/': function() {
        console.log('/ を表示します');
        
        that.updateQuery(that.filters);
      }
    })
    .on({
      '/setup': function() {
        console.log('/setup を表示します');
        that.viewSetup();
      }
    })
    .on({
      '/restaurants/*': function() {
        console.log('/restaurants/* を表示します');
        // URLからdocumentIDを取得する
        var path = that.getCleanPath(document.location.pathname);
        var id = path.split('/')[2];
        that.viewRestaurant(id);
      }
    })
    .resolve();

  // restaurants コレクションにドキュメントが存在するか確認する
  firebase
    .firestore()
    .collection('restaurants')
    .limit(1)
    .onSnapshot(function(snapshot) {
      if (snapshot.empty) {
        console.log('initRouter(): restaurantsコレクションにDocumentが存在しません /setup　へ移動');
        that.router.navigate('/setup');
      }
    });

  console.log('initRouter end');
};

FriendlyEats.prototype.getCleanPath = function(dirtyPath) {
  console.log('getCleanPath start');
  if (dirtyPath.startsWith('/index.html')) {
    return dirtyPath.split('/').slice(1).join('/');
  } else {
    return dirtyPath;
  }
  console.log('getCleanPath end');
};

FriendlyEats.prototype.getFirebaseConfig = function() {
  console.log('本Firebaseアプリのoptionsを取得する options:' + firebase.app().options);
  return firebase.app().options;
};

// レストランの名前をランダムに決める時に使う
FriendlyEats.prototype.getRandomItem = function(arr) {
  // console.log('getRandomItem');
  return arr[Math.floor(Math.random() * arr.length)];
};

FriendlyEats.prototype.data = {
  words: [
    'Bar',
    'Fire',
    'Grill',
    'Drive Thru',
    'Place',
    'Best',
    'Spot',
    'Prime',
    'Eatin\''
  ],
  cities: [
    'Albuquerque',
    'Arlington',
    'Atlanta',
    'Austin',
    'Baltimore',
    'Boston',
    'Charlotte',
    'Chicago',
    'Cleveland',
    'Colorado Springs',
    'Columbus',
    'Dallas',
    'Denver',
    'Detroit',
    'El Paso',
    'Fort Worth',
    'Fresno',
    'Houston',
    'Indianapolis',
    'Jacksonville',
    'Kansas City',
    'Las Vegas',
    'Long Island',
    'Los Angeles',
    'Louisville',
    'Memphis',
    'Mesa',
    'Miami',
    'Milwaukee',
    'Nashville',
    'New York',
    'Oakland',
    'Oklahoma',
    'Omaha',
    'Philadelphia',
    'Phoenix',
    'Portland',
    'Raleigh',
    'Sacramento',
    'San Antonio',
    'San Diego',
    'San Francisco',
    'San Jose',
    'Tucson',
    'Tulsa',
    'Virginia Beach',
    'Washington'
  ],
  categories: [
    'Brunch',
    'Burgers',
    'Coffee',
    'Deli',
    'Dim Sum',
    'Indian',
    'Italian',
    'Mediterranean',
    'Mexican',
    'Pizza',
    'Ramen',
    'Sushi'
  ],
  ratings: [
    {
      rating: 1,
      text: 'Would never eat here again!'
    },
    {
      rating: 2,
      text: 'Not my cup of tea.'
    },
    {
      rating: 3,
      text: 'Exactly okay :/'
    },
    {
      rating: 4,
      text: 'Actually pretty good, would recommend!'
    },
    {
      rating: 5,
      text: 'This is my favorite place. Literally.'
    }
  ]
};

// ここが全ての始まり
window.onload = function() {
  console.log('onload start');  
  window.app = new FriendlyEats();
  console.log('onload end');  
};
