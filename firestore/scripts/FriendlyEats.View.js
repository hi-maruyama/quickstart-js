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
//  templatesクラスの要素を検出して保持する
//
FriendlyEats.prototype.initTemplates = function() {
  console.log('templatesクラスの検出 START');
  this.templates = {};

  var that = this;
  // templateクラスを検索する
  document.querySelectorAll('.template').forEach(function(el) {
    // id名をキーにして要素を保存する
    that.templates[el.getAttribute('id')] = el;
  });

  console.log('templatesクラスの検出 END');
};

FriendlyEats.prototype.viewHome = function() {
  console.log('viewHome start');
  this.getAllRestaurants();
  console.log('viewHome end');
};

//
//  filters: 検索条件の辞書
//  filter_description: 検索条件を表現した文章
//
FriendlyEats.prototype.viewList = function(filters, filter_description) {
  console.log('viewList start');

  if (!filter_description) {
    filter_description = 'any type of food with any price in any city.';
  }

  // 2つのテンプレートを可視化する
  var mainEl = this.renderTemplate('main-adjusted');
  // `data-fir-if`属性がhasSectionHeaderを持っていたら表示する
  var headerEl = this.renderTemplate('header-base', {
    hasSectionHeader: true
  });

  // section-headeの中にfilter-displayを挿入する
  this.replaceElement(
    headerEl.querySelector('#section-header'),
    this.renderTemplate('filter-display', {
      filter_description: filter_description
    })
  );

  // .headerの中にheader-baseを挿入する
  this.replaceElement(document.querySelector('.header'), headerEl);
  // mainの中にmain-adjustedを挿入する
  this.replaceElement(document.querySelector('main'), mainEl);

  var that = this;

  // clickイベントのコールバック関数をセットする
  headerEl.querySelector('#show-filters').addEventListener('click', function() {
    console.log('show-filters start　クリックされました');
    that.dialogs.filter.show();
    console.log('show-filters end');
  });

  // Documetを画面に表示するコールバック関数
  // doc: Firestoreのレストランdocument
  var renderResults = function(doc) {
    console.log('renderResults start');

    if (!doc) {
      // 引数なしで呼ばれた場合
      var headerEl = that.renderTemplate('header-base', {
        hasSectionHeader: true
      });

      var noResultsEl = that.renderTemplate('no-results');

      that.replaceElement(
        headerEl.querySelector('#section-header'),
        that.renderTemplate('filter-display', {
          filter_description: filter_description
        })
      );

      headerEl.querySelector('#show-filters').addEventListener('click', function() {
        console.log('show-filters start');
        that.dialogs.filter.show();
        console.log('show-filters start');
      });

      that.replaceElement(document.querySelector('.header'), headerEl);
      that.replaceElement(document.querySelector('main'), noResultsEl);
      return;
    }
    
    // documentからレストラン情報を取り出してdivにセットしていく
    var data = doc.data();
    // documentIdをセット
    data['.id'] = doc.id;
    // レストラン詳細ページへ移動する関数をセット
    data['go_to_restaurant'] = function() {
      that.router.navigate('/restaurants/' + doc.id);
    };

    var el = that.renderTemplate('restaurant-card', data);
    el.querySelector('.rating').append(that.renderRating(data.avgRating));
    el.querySelector('.price').append(that.renderPrice(data.price));

    // divを追加していく
    mainEl.querySelector('#cards').append(el);

    console.log('renderResults end');
  };

  // /restaurantsの監視を開始する
  if (filters.city || filters.category || filters.price || filters.sort !== 'Rating' ) {
    // 何かしらの条件が指定されている場合

    // フィルター条件を指定して監視を開始する
    this.getFilteredRestaurants({
      city: filters.city || 'Any',
      category: filters.category || 'Any',
      price: filters.price || 'Any',
      sort: filters.sort
    }, renderResults);
  } else {
    // 何も条件が指定されていない場合

    // 全てのレストランを取得するクエリー監視を開始する
    this.getAllRestaurants(renderResults);
  }

  // ヘッダーのツールバーをセットアップしてるっぽい
  var toolbar = mdc.toolbar.MDCToolbar.attachTo(document.querySelector('.mdc-toolbar'));
  toolbar.fixedAdjustElement = document.querySelector('.mdc-toolbar-fixed-adjust');

  mdc.autoInit();

  console.log('viewList end');
};

//
// モック追加ページ(/setupページ)表示
//
FriendlyEats.prototype.viewSetup = function() {
  console.log('viewSetup start');

  var headerEl = this.renderTemplate('header-base', {
    hasSectionHeader: false
  });

  // firebaseアプリのoptionsを取得する
  var config = this.getFirebaseConfig();
  var noRestaurantsEl = this.renderTemplate('no-restaurants', config);

  // モック追加ボタン
  var button = noRestaurantsEl.querySelector('#add_mock_data');
  // 'ADD MOCK DATA'ボタン押されたフラグ
  var addingMockData = false;

  var that = this;
  
  // 'ADD MOCK DATA'ボタンのハンドラーをセットする
  button.addEventListener('click', function(event) {
    console.log('ADD MOCK DATAボタン click!');
    
    if (addingMockData) {
      return;
    }

  // 'ADD MOCK DATA'ボタン押されたフラグをONにする
  addingMockData = true;

    event.target.style.opacity = '0.4';
    event.target.innerText = 'Please wait...';

    // Firestoreへモック用レストランを追加する
    that.addMockRestaurants().then(function() {
      // 同じページを再描画する。(/setup に紐付けられた関数を実行する)
      that.rerender();
    });
  });

  // headerクラスとmainに入れて表示する
  this.replaceElement(document.querySelector('.header'), headerEl);
  this.replaceElement(document.querySelector('main'), noRestaurantsEl);

  // /restaurantsを監視してdocumentが追加されたら'/'へ移動する
  firebase
    .firestore()
    .collection('restaurants')
    .limit(1)
    .onSnapshot(function(snapshot) {
      console.log('viewSetup(): restaurants のドキュメント数:' + snapshot.size + ' addingMockData:' + addingMockData);
      
      if (snapshot.size && !addingMockData) {
        // documentが存在する かつ 'ADD MOCK DATA'ボタン押下により作成されたレストランでない場合
        // 'ADD MOCK DATA'によりレストランを追加すると、上の`that.rerender();`により再描画され、またこのリスナーがセットされる。その時にこのif文が真となる
        console.log('/ へ移動します');
        
        that.router.navigate('/');
      }
    });

  console.log('viewSetup end');
};

//
//  レストランページの＋マークを追加して表示されるレビュー書き込み用ダイアログっぽい
//
FriendlyEats.prototype.initReviewDialog = function() {
  console.log('initReviewDialog start');

  var dialog = document.querySelector('#dialog-add-review');
  this.dialogs.add_review = new mdc.dialog.MDCDialog(dialog);

  var that = this;
  this.dialogs.add_review.listen('MDCDialog:accept', function() {
    console.log('listen start');

    var pathname = that.getCleanPath(document.location.pathname);
    var id = pathname.split('/')[2];

    that.addRating(id, {
      rating: rating,
      text: dialog.querySelector('#text').value,
      userName: 'Anonymous (Web)',
      timestamp: new Date(),
      userId: firebase.auth().currentUser.uid
    }).then(function() {
      that.rerender();
    });
  });

  var rating = 0;

  dialog.querySelectorAll('.star-input i').forEach(function(el) {
    var rate = function() {
      var after = false;
      rating = 0;
      [].slice.call(el.parentNode.children).forEach(function(child) {
        if (!after) {
          rating++;
          child.innerText = 'star';
        } else {
          child.innerText = 'star_border';
        }
        after = after || child.isSameNode(el);
      });
    };
    el.addEventListener('mouseover', rate);
  });

  console.log('initReviewDialog end');
};

FriendlyEats.prototype.initFilterDialog = function() {
  console.log('initFilterDialog start');

  // TODO: Reset filter dialog to init state on close.
  this.dialogs.filter = new mdc.dialog.MDCDialog(document.querySelector('#dialog-filter-all'));

  var that = this;
  this.dialogs.filter.listen('MDCDialog:accept', function() {
    that.updateQuery(that.filters);
  });

  var dialog = document.querySelector('aside');
  var pages = dialog.querySelectorAll('.page');

  this.replaceElement(
    dialog.querySelector('#category-list'),
    that.renderTemplate('item-list', { items: ['Any'].concat(that.data.categories) })
  );

  this.replaceElement(
    dialog.querySelector('#city-list'),
    that.renderTemplate('item-list', { items: ['Any'].concat(that.data.cities) })
  );

  var renderAllList = function() {
    that.replaceElement(
      dialog.querySelector('#all-filters-list'),
      that.renderTemplate('all-filters-list', that.filters)
    );

    dialog.querySelectorAll('#page-all .mdc-list-item').forEach(function(el) {
      el.addEventListener('click', function() {
        var id = el.id.split('-').slice(1).join('-');
        displaySection(id);
      });
    });
  };

  var displaySection = function(id) {
    if (id === 'page-all') {
      renderAllList();
    }

    pages.forEach(function(sel) {
      if (sel.id === id) {
        sel.style.display = 'block';
      } else {
        sel.style.display = 'none';
      }
    });
  };

  pages.forEach(function(sel) {
    var type = sel.id.split('-')[1];
    if (type === 'all') {
      return;
    }

    sel.querySelectorAll('.mdc-list-item').forEach(function(el) {
      el.addEventListener('click', function() {
        that.filters[type] = el.innerText.trim() === 'Any'? '' : el.innerText.trim();
        displaySection('page-all');
      });
    });
  });

  displaySection('page-all');
  dialog.querySelectorAll('.back').forEach(function(el) {
    el.addEventListener('click', function() {
      displaySection('page-all');
    });
  });

  console.log('initFilterDialog end');
};

//
//  filters: 検索条件の辞書
//
FriendlyEats.prototype.updateQuery = function(filters) {
  console.log('updateQuery start');

  // 検索条件を表現する文章
  var query_description = '';

  // カテゴリ条件の有無を確認する
  if (filters.category !== '') {
    query_description += filters.category + ' places';
  } else {
    query_description += 'any restaurant';
  }

  if (filters.city !== '') {
    query_description += ' in ' + filters.city;
  } else {
    query_description += ' located anywhere';
  }

  if (filters.price !== '') {
    query_description += ' with a price of ' + filters.price;
  } else {
    query_description += ' with any price';
  }

  if (filters.sort === 'Rating') {
    query_description += ' sorted by rating';
  } else if (filters.sort === 'Reviews') {
    query_description += ' sorted by # of reviews';
  }

  this.viewList(filters, query_description);

  console.log('updateQuery end');
};

//
//  レストランページを表示する
//  id: レストランのdocumentID
//
FriendlyEats.prototype.viewRestaurant = function(id) {
  console.log('viewRestaurant start');

  var sectionHeaderEl;
  var that = this;

  // Firestoreからレストランdocumentを取得する
  return this.getRestaurant(id)
    .then(function(doc) {
      // doc: レストランdocument

      var data = doc.data();
      var dialog =  that.dialogs.add_review;

      data.show_add_review = function() {
        dialog.show();
      };

      sectionHeaderEl = that.renderTemplate('restaurant-header', data);
      sectionHeaderEl
        .querySelector('.rating')
        .append(that.renderRating(data.avgRating));

      sectionHeaderEl
        .querySelector('.price')
        .append(that.renderPrice(data.price));

      // サブコレクションratingsの一覧を取得する
      return doc.ref.collection('ratings').orderBy('timestamp', 'desc').get();
    })
    .then(function(ratings) {
      // ratings: レストランdocumentのサブコレクションratingsのdocument一覧

      var mainEl;

      if (ratings.size) {
      // レーティングが存在する場合
      mainEl = that.renderTemplate('main');

        ratings.forEach(function(rating) {
          var data = rating.data();
          // DIVへレート情報をセットする
          var el = that.renderTemplate('review-card', data);
          // レートをセットする
          el.querySelector('.rating').append(that.renderRating(data.rating));
          // レートリストへDIVを追加する
          mainEl.querySelector('#cards').append(el);
        });
      } else {
        // レーティングが存在しない場合
        
        // モック用レートを追加するクリック用イベントをdivに追加する
        mainEl = that.renderTemplate('no-ratings', {
          add_mock_data: function() {
            // 1〜5個のレートを書き込む
            that.addMockRatings(id).then(function() {
              // 全てのレートの書き込みが成功した場合
              that.rerender();
            });
          }
        });
      }

      var headerEl = that.renderTemplate('header-base', {
        hasSectionHeader: true
      });

      that.replaceElement(document.querySelector('.header'), sectionHeaderEl);
      that.replaceElement(document.querySelector('main'), mainEl);
    })
    .then(function() {
      // 謎
      that.router.updatePageLinks();
    })
    .catch(function(err) {
      console.warn('Error rendering page', err);
    });
};

//
// 指定IDの要素を表示する
// id: templateのdiv要素のID属性
// data: パラメータ辞書
//
FriendlyEats.prototype.renderTemplate = function(id, data) {
  // console.log('テンプレートを表示します id:' + id);

  // テンプレート辞書からIDにマッチするDIV要素を取得する
  var template = this.templates[id];
  // ノードを複製する(子孫も含めて)
  var el = template.cloneNode(true);
  // 非表示属性を削除する (表示する)
  el.removeAttribute('hidden');
  this.render(el, data);

  return el;
};

// 引数で渡されたtemplate要素の配下から、いくつかのdata属性の要素を検出し、その要素に対して処理をする。処理内容は引数dataでカスタムできる。
//
// el: templateのdiv要素
// data: パラメータ辞書
FriendlyEats.prototype.render = function(el, data) {
  // console.log('render start');

  if (!data) {
    return;
  }

  var that = this;

  // 各data属性を持つ要素に対して実行する処理を定義する
  // tel: 各data属性を持つDIV要素
  var modifiers = {
    'data-fir-foreach': function(tel) {
      console.log('aaa');
      
      var field = tel.getAttribute('data-fir-foreach');
      var values = that.getDeepItem(data, field);

      values.forEach(function (value, index) {
        var cloneTel = tel.cloneNode(true);
        tel.parentNode.append(cloneTel);

        Object.keys(modifiers).forEach(function(selector) {
          var children = Array.prototype.slice.call(
            cloneTel.querySelectorAll('[' + selector + ']')
          );
          children.push(cloneTel);
          children.forEach(function(childEl) {
            var currentVal = childEl.getAttribute(selector);

            if (!currentVal) {
              return;
            }

            childEl.setAttribute(
              selector,
              currentVal.replace('~', field + '/' + index)
            );
          });
        });
      });

      tel.parentNode.removeChild(tel);
    },
    'data-fir-content': function(tel) {
      // 要素からdata-fir-content属性の値を取り出し、それをキー文字列としてdata辞書から値(文字列)を取り出し、その値を要素のテキストへセットする
      var field = tel.getAttribute('data-fir-content');
      tel.innerText = that.getDeepItem(data, field);
    },
    'data-fir-click': function(tel) {
      // クリックハンドラーをセットする
      tel.addEventListener('click', function() {
        // data属性の値にセットされた関数名の文字列を取得する
        var field = tel.getAttribute('data-fir-click');
        // data辞書から関数を取り出して実行する
        that.getDeepItem(data, field)();
      });
    },
    'data-fir-if': function(tel) {
      // 要素から'data-fir-if'属性の値を取り出し、それをキー文字列としてdata辞書から値(Bool値)を取り出し、その値によって表示・非表示を実施する
      var field = tel.getAttribute('data-fir-if');
      if (!that.getDeepItem(data, field)) {
        // 要素を非表示にする
        tel.style.display = 'none';
      }
    },
    'data-fir-if-not': function(tel) {
      console.log('aaa');
      var field = tel.getAttribute('data-fir-if-not');
      if (that.getDeepItem(data, field)) {
        tel.style.display = 'none';
      }
    },
    'data-fir-attr': function(tel) {
      console.log('aaa');
      var chunks = tel.getAttribute('data-fir-attr').split(':');
      var attr = chunks[0];
      var field = chunks[1];
      tel.setAttribute(attr, that.getDeepItem(data, field));
    },
    'data-fir-style': function(tel) {
      // この要素に　`style="background-image: url("https://storage.googleapis.com/1.png");" `のような背景画像を読み込ませるスタイルをセットする

      var chunks = tel.getAttribute('data-fir-style').split(':'); // backgroundImage:photo
      var attr = chunks[0]; //backgroundImage
      var field = chunks[1];  // photo
      var value = that.getDeepItem(data, field); // Firestoreのdocumentのphotoフィールドの値(画像のURL)を取得する
      if (attr.toLowerCase() === 'backgroundimage') {
        value = 'url(' + value + ')';
      }
      // CSSのbackground-imageに画像のURLをセットしてロードを開始する
      tel.style[attr] = value;
    }
  };

  // data属性の名前で配列を生成する
  var preModifiers = ['data-fir-foreach'];

  preModifiers.forEach(function(selector) {
    // data-fir-foreachキーに紐づいた関数を取得する
    var modifier = modifiers[selector];
    that.useModifier(el, selector, modifier);
  });

  // data属性のキーを走査する
  Object.keys(modifiers).forEach(function(selector) {
    // selector: data属性の名前 e.g. `data-fir-content`

    // 配列に指定の要素が存在するか確認する
    if (preModifiers.indexOf(selector) !== -1) {
      // 配列に指定の要素が存在する場合
      // すでに上のforEach文で実行したのでreturnする
      return;
    }
    // 配列に指定の要素が存在しなかった場合

    var modifier = modifiers[selector];
    that.useModifier(el, selector, modifier);
  });

  // console.log('render end');
};

// template要素の配下で指定されたdata属性(selectorの)を持つ要素を検索して、modifier関数に渡して実行する
// el: templateのdiv要素
// selector: data属性の文字列
// modifier: マッチした要素を処理するコールバック関数
//
FriendlyEats.prototype.useModifier = function(el, selector, modifier) {
  // console.log('useModifier start');
  el.querySelectorAll('[' + selector + ']').forEach(modifier);
  // console.log('useModifier end');
};

//
// obj辞書の中からキーpathの値を取得して返す
//
//  obj: プログラマーにより渡された辞書パラメータ
//  path: data属性の値
//  return: 辞書から取り出された値
FriendlyEats.prototype.getDeepItem = function(obj, path) {
  path.split('/').forEach(function(chunk) {
    obj = obj[chunk];
  });
  // console.log('getDeepItem() path:' + path + ' obj:' + obj);
  return obj;
};

FriendlyEats.prototype.renderRating = function(rating) {
  console.log('レーティング用スターを描画する');

  var el = this.renderTemplate('rating', {});
  for (var r = 0; r < 5; r += 1) {
    var star;
    if (r < Math.floor(rating)) {
      star = this.renderTemplate('star-icon', {});
    } else {
      star = this.renderTemplate('star-border-icon', {});
    }
    el.append(star);
  }
  return el;
};

FriendlyEats.prototype.renderPrice = function(price) {
  console.log('$マークを描画する');
  var el = this.renderTemplate('price', {});
  for (var r = 0; r < price; r += 1) {
    el.append('$');
  }
  return el;
};

//
// parentの中のDIV要素をcontentのDIV要素に置き換える
//
FriendlyEats.prototype.replaceElement = function(parent, content) {
  // console.log('replaceElement start');
  parent.innerHTML = '';
  parent.append(content);
  // console.log('replaceElement end');
};

FriendlyEats.prototype.rerender = function() {
  console.log('同じページを再描画する');
  this.router.navigate(document.location.pathname + '?' + new Date().getTime());
};
