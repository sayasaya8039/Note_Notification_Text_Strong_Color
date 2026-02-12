# Note通知テキスト強調カラー

![Version](https://img.shields.io/badge/version-1.2.0-blue.svg)
![Manifest](https://img.shields.io/badge/Manifest-V3-green.svg)
![License](https://img.shields.io/badge/license-MIT-yellow.svg)

## 概要

**Note通知テキスト強調カラー**は、[note.com](https://note.com) の通知ドロップダウンに表示されるテキストを見やすくするChrome拡張機能です。

note.comの通知パネルはデフォルトではテキストが薄く読みづらいことがあります。この拡張機能を使うことで、フォントの太さ・サイズ・色を自由にカスタマイズし、通知テキストの視認性を大幅に向上させることができます。

## スクリーンショット

> ※ スクリーンショットは後日追加予定です。

| ポップアップUI | 通知パネル（適用前） | 通知パネル（適用後） |
|:-:|:-:|:-:|
| ![Popup](screenshots/popup.png) | ![Before](screenshots/before.png) | ![After](screenshots/after.png) |

## 機能一覧

| 機能 | 説明 |
|------|------|
| フォント太さ調整 | 400〜900の範囲でスライダー操作（デフォルト: 600） |
| フォントサイズ調整 | 12〜20pxの範囲でスライダー操作（デフォルト: 14px） |
| テキストカラー変更 | カラーピッカーで任意の色を選択（デフォルト: #1a1a1a） |
| 新しいタブで開くボタン | 各通知の下に「新しいタブで開く」リンクを自動追加 |
| 有効/無効トグル | ワンクリックで拡張機能のON/OFFを切り替え |
| リアルタイムプレビュー | ポップアップ内でスタイル変更を即座に確認 |
| ダークモード対応 | OSのテーマ設定に連動したポップアップUI |
| 動的DOM対応 | MutationObserverにより、後から読み込まれる通知要素にも自動適用 |
| 設定永続化 | chrome.storage.syncでデバイス間の設定同期に対応 |
| デフォルトリセット | ボタン一つで全設定を初期状態に復元 |

## インストール方法

### 開発者モードで読み込む（推奨）

1. このリポジトリをクローンまたはダウンロードします。

```bash
git clone https://github.com/your-username/Note_Notification_Text_Strong_Color.git
```

2. Chromeで `chrome://extensions/` を開きます。
3. 右上の「**デベロッパーモード**」を有効にします。
4. 「**パッケージ化されていない拡張機能を読み込む**」をクリックします。
5. ダウンロードした `Note_Notification_Text_Strong_Color` フォルダを選択します。
6. 拡張機能が追加され、ツールバーにアイコンが表示されます。

### ZIPファイルから読み込む

1. リリースページからZIPファイルをダウンロードします。
2. ZIPファイルを任意のフォルダに解凍します。
3. 上記の手順2〜6と同様に読み込みます。

### ZIPファイルのビルド

```bash
npm run build
```

`note-notification-text-strong-color.zip` が生成されます。

## 使い方

1. [note.com](https://note.com) を開きます。
2. ツールバーの拡張機能アイコンをクリックしてポップアップを開きます。
3. 各設定を調整します。
   - **フォント太さ**: スライダーを左右に動かして太さを変更（400=細い、900=太い）
   - **フォントサイズ**: スライダーを左右に動かしてサイズを変更（12px〜20px）
   - **テキストカラー**: カラーピッカーをクリックして色を選択
   - **新しいタブで開くボタン**: トグルでON/OFF切り替え
4. プレビューエリアで変更内容をリアルタイムに確認できます。
5. 設定は自動的に保存され、次回以降も反映されます。
6. 通知ベルをクリックすると、カスタマイズされたスタイルで通知が表示されます。

### 新しいタブで開く機能

通知パネル内の各通知アイテムの下に「新しいタブで開く」リンクが自動で追加されます。このリンクをクリックすると、通知先のページが新しいタブで開きます。通知パネルを閉じずに複数の通知を確認したい場合に便利です。

### 拡張機能の無効化

ポップアップ上部の「**拡張機能を有効にする**」トグルをOFFにすると、元のスタイルに戻ります。

### 設定のリセット

ポップアップ下部の「**デフォルトに戻す**」ボタンをクリックすると、すべての設定が初期値に戻ります。

## 技術詳細

### アーキテクチャ

この拡張機能は、Chrome Extension Manifest V3に準拠しており、以下の構成で動作します。

```
[ポップアップUI] <--> [chrome.storage.sync] <--> [Content Script]
    popup.js              設定の永続化           content.js + content.css
                                                      |
                                                      v
                                               [Background SW]
                                                background.js
                                              (新しいタブを開く)
```

### スタイル適用の仕組み

1. **CSS変数による制御**: `:root` にCSS変数（`--nnts-font-weight`, `--nnts-font-size`, `--nnts-text-color`）を設定し、content.cssのセレクタから参照します。

2. **インラインスタイル補強**: CSS変数だけでは適用されないケース（Svelteのスコープ付きクラス等）に対応するため、content.jsから `!important` 付きのインラインスタイルも併用します。

3. **属性セレクタの活用**: note.comはSvelteベースのため、クラス名にハッシュが付与されます。`[class*="notifItem"]` のような部分一致セレクタで、ハッシュ付きクラスにも確実にマッチします。

### 新しいタブで開く機能の実装

note.comの通知アイテムは透明な `<a>` オーバーレイ（`m-navbarNoticeItem__link`）で全体が覆われているため、通常の方法では新しいタブを開くことができません。この拡張機能では以下の方式で実装しています。

1. **オーバーレイリンクの直接検出**: `a[class*="navbarNoticeItem__link"]` セレクタでnote.comの通知オーバーレイリンクを特定
2. **sibling挿入**: `insertAdjacentElement("afterend")` で各通知アイテムの**直後**にボタンを配置
3. **windowキャプチャフェーズ**: イベント伝播の最上位（`window`のcapture phase）でクリックを処理し、note.comのイベントハンドラより先に動作
4. **Background Service Worker**: `chrome.tabs.create()` APIで確実に新しいタブを開く（ポップアップブロッカーの影響を受けない）

### MutationObserverによる動的対応

note.comの通知パネルは、ベルアイコンのクリック時に動的にDOMが生成されます。MutationObserverで `childList` の変更を監視し、新しい通知要素が追加された際に自動的にスタイルとボタンを適用します。

### 設定の同期

`chrome.storage.sync` を使用して設定を保存します。ポップアップからの変更は `chrome.storage.onChanged` リスナーで即座にContent Scriptに反映されます。ページのリロードは不要です。

## プロジェクト構成

```
Note_Notification_Text_Strong_Color/
├── manifest.json          # 拡張機能のマニフェスト（Manifest V3）
├── package.json           # npmスクリプト定義（ZIPビルド用）
├── README.md              # このファイル
├── icons/                 # 拡張機能アイコン
│   ├── icon16.png         #   ツールバー用（16x16）
│   ├── icon32.png         #   タスクバー用（32x32）
│   ├── icon48.png         #   拡張機能管理画面用（48x48）
│   └── icon128.png        #   Chromeウェブストア用（128x128）
└── src/                   # ソースコード
    ├── background.js      #   Background Service Worker（タブ操作）
    ├── content.css        #   通知要素のスタイル定義（CSS変数使用）
    ├── content.js         #   Content Script（スタイル適用・ボタン挿入）
    ├── popup.html         #   ポップアップUIのHTML
    ├── popup.css          #   ポップアップUIのスタイル（ダークモード対応）
    └── popup.js           #   ポップアップUIのロジック（設定管理・プレビュー）
```

## カスタマイズ

### CSS変数

`src/content.css` で定義されているCSS変数を直接編集することで、デフォルト値を変更できます。

```css
:root {
  --nnts-font-weight: 600;        /* フォント太さ（400-900） */
  --nnts-font-size: 14px;         /* フォントサイズ（12-20px） */
  --nnts-text-color: #1a1a1a;     /* テキストカラー */
  --nnts-line-height: 1.6;        /* 行間 */
  --nnts-letter-spacing: 0.02em;  /* 字間 */
}
```

### デフォルト設定値

`src/content.js` および `src/popup.js` の `DEFAULTS` オブジェクトを編集することで、初期設定値を変更できます。

```javascript
const DEFAULTS = {
  enabled: true,          // 有効/無効
  fontWeight: 600,        // フォント太さ
  fontSize: 14,           // フォントサイズ（px）
  textColor: "#1a1a1a",   // テキストカラー
  newTabButton: true,     // 新しいタブで開くボタン
};
```

## 技術スタック

| 技術 | 用途 |
|------|------|
| Chrome Extension Manifest V3 | 拡張機能の基盤 |
| Background Service Worker | 新しいタブを開く（chrome.tabs.create） |
| Vanilla JavaScript | フレームワーク不使用で軽量動作 |
| CSS変数 + 属性セレクタ | Svelteのスコープ付きクラスに対応 |
| MutationObserver API | 動的に生成される通知DOMの監視 |
| chrome.storage.sync API | デバイス間の設定同期・永続化 |

## 更新履歴

### v1.2.0 (2026-02-13)

- 「新しいタブで開く」ボタン機能を追加
  - 各通知アイテムの下にリンクを自動配置
  - Background Service Worker経由で確実にタブを開く
  - windowキャプチャフェーズでnote.comのイベントより先にクリックを処理
  - note.comのオーバーレイリンク構造（`m-navbarNoticeItem__link`）に対応
- ポップアップUIに「新しいタブで開くボタン」ON/OFFトグルを追加
- Background Service Worker（`background.js`）を新規追加

### v1.0.0 (2026-02-12)

- 初回リリース
- フォント太さ・サイズ・カラーのカスタマイズ機能
- リアルタイムプレビュー
- ダークモード対応ポップアップUI
- MutationObserverによる動的DOM対応
- SPA（pushState / replaceState / popstate）対応

## 動作要件

- Google Chrome 88以降（Manifest V3対応ブラウザ）
- note.com へのアクセス

## ライセンス

MIT License

Copyright (c) 2026

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
