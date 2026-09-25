# DoCope

DoCope は、ローカルに分散している開発プロジェクトやドキュメントを、ブラウザ上で一覧・閲覧するためのローカルアプリケーションです。

## 開発の背景と目的

開発中のプロジェクトでは、ソースコード、設計資料、AIとの会話ログ、学習記録などが複数のフォルダに分かれて保存されます。DoCope は、それらを一つの場所から見つけて確認できるようにすることを目的に作っています。

単なるファイルブラウザではなく、「どのプロジェクトに、どのような資料があるのか」を把握し、必要なファイルへすぐ移動できる作業場を目指しています。

アプリを作った意図や設計上の考え方については、[プロジェクトの思想と設計方針](docs/PROJECT_VISION.md) にまとめています。

## プレビュー

実際の操作イメージは、以下の動画で確認できます。

### Mobile

<iframe width="560" height="315" src="https://www.youtube.com/embed/-KgeKK04afE?si=PfRKH4E1AaYN1xO5" title="DoCope Mobile preview" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

### PC

<iframe width="560" height="315" src="https://www.youtube.com/embed/Fz2FUJREyoY?si=7SCRhCGwtOPaBrvR" title="DoCope PC preview" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

## 現在できること

- ローカルのプロジェクトフォルダを登録・編集・削除
- プロジェクト名、説明、識別色、アイコンの設定
- 登録したプロジェクトの一覧表示
- プロジェクト内のフォルダ・ファイルツリーの表示
- テキストファイルの内容表示
- 画像などのファイルのプレビュー
- 隠しファイルやシステム用ファイルの表示切り替え
- 登録先フォルダが存在するかどうかの確認

## 動作環境

- Java 21
- Maven Wrapper 同梱

## 起動方法

```bash
./mvnw spring-boot:run
```

起動後、ブラウザで `http://localhost:8080` を開きます。

初回利用時は「新規登録」から、閲覧したいプロジェクトの実在するルートフォルダを登録してください。

## テスト

```bash
./mvnw test
```

## 今後の展望

今後追加したい機能や改善案は、実装可能な単位に分けて Issue として管理します。アプリ全体の将来像や、個別のIssueに分解する前の考え方は、設計ドキュメントに記録します。

## 技術構成

- Spring Boot
- Spring MVC / Thymeleaf
- Spring Data JPA
- SQLite
- JavaScript / CSS
