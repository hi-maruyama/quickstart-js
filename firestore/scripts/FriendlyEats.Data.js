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
//  firestoreにレストランを追加する
//  data: レストラン辞書
//  return: promise
FriendlyEats.prototype.addRestaurant = function(data) {
  console.log('/restaurants へレストランDocumentを新規作成する');
  var collection = firebase.firestore().collection('restaurants');
  return collection.add(data);
};

//
//  フィルター条件無しで /restaurants を監視する
//
FriendlyEats.prototype.getAllRestaurants = function(render) {
  console.log('/restaurants のレストランDocumetのqueryを生成する');
  var query = firebase.firestore()
    .collection('restaurants')
    .orderBy('avgRating', 'desc')
    .limit(50);
  // クエリーのリッスンを開始する
  this.getDocumentsInQuery(query, render);
};

//
//  queryをアタッチする。documentが追加されたら、引数のrenderを使って画面に表示する
//
FriendlyEats.prototype.getDocumentsInQuery = function(query, render) {
  console.log('クエリーをアタッチします');

  // QuerySnapshotイベントのリスナーをアタッチする
  query.onSnapshot(function (snapshot) {
    console.log('ドキュメント数:' + snapshot.size);
    if (!snapshot.size) {      
      // ドキュメントが０の場合
      return render();
    }

    // documentが存在する場合
    snapshot.docChanges().forEach(function(change) {
      console.log(change);
      
      if (change.type === 'added') {
        render(change.doc);
      }
    });
  });

};

//
//  Firestoreからレストランdocumentを取得する
//
FriendlyEats.prototype.getRestaurant = function(id) {
  console.log('レストランdocumentを取得します id:' + id);
  return firebase.firestore().collection('restaurants').doc(id).get();
};

//
// フィルター条件付きで /restaurants を監視する
//
FriendlyEats.prototype.getFilteredRestaurants = function(filters, render) {
  console.log('getFilteredRestaurants start');

  var query = firebase.firestore().collection('restaurants');

  if (filters.category !== 'Any') {
    query = query.where('category', '==', filters.category);
  }

  if (filters.city !== 'Any') {
    query = query.where('city', '==', filters.city);
  }

  if (filters.price !== 'Any') {
    query = query.where('price', '==', filters.price.length);
  }

  if (filters.sort === 'Rating') {
    query = query.orderBy('avgRating', 'desc');
  } else if (filters.sort === 'Reviews') {
    query = query.orderBy('numRatings', 'desc');
  }

  this.getDocumentsInQuery(query, render);

  console.log('getFilteredRestaurants end');

};

//
//  レストランdocumentのレート数と平均レートの2フィールドの値を更新して、サブコレクションratingsに新規レートを追加する
//
FriendlyEats.prototype.addRating = function(restaurantID, rating) {
  console.log('レート追加トランザクションを実行する');

  var collection = firebase.firestore().collection('restaurants');
  var document = collection.doc(restaurantID);
  var newRatingDocument = document.collection('ratings').doc();

  return firebase.firestore().runTransaction(function(transaction) {
    // レストランdocumentを取得する
    return transaction.get(document).then(function(doc) {
      // レストランdocumentからデータ辞書を取得する
      var data = doc.data();
      // 新しいレートを追加した平均レート算出する
      var newAverage =
          (data.numRatings * data.avgRating + rating.rating) /
          (data.numRatings + 1);

      // レート数と平均レートの2フィールドの値を更新する
      transaction.update(document, {
        numRatings: data.numRatings + 1,
        avgRating: newAverage
      });

      // サブコレクションratingsに新規レートを追加する
      return transaction.set(newRatingDocument, rating);
    });
  });

};
