# Tetromino Fall Game

<p>
  <a href="https://seiya-matsuoka.github.io/tetromino-fall-game/"> 
    <img alt="Demo" src="https://img.shields.io/badge/demo-GitHub%20Pages-2ea44f?logo=github">
  </a>
  <a href="https://github.com/seiya-matsuoka/tetromino-fall-game/actions/workflows/deploy.yml">
    <img alt="Deploy" src="https://github.com/seiya-matsuoka/tetromino-fall-game/actions/workflows/deploy.yml/badge.svg?branch=main">
  </a>
</p>

<p>
  <img alt="TypeScript" src="https://img.shields.io/badge/typescript-5%2B-3178C6?logo=typescript">
  <img alt="Vite" src="https://img.shields.io/badge/vite-5+-646CFF?logo=vite">
  <img alt="Tailwind v4" src="https://img.shields.io/badge/tailwindcss-4-06B6D4?logo=tailwindcss">
</p>

落下パズル（テトロミノ）を 7バッグ・回転・レベル制の重力・スコア・キーボード/タッチ操作で実装。

## デモ

公開 URL: https://seiya-matsuoka.github.io/tetromino-fall-game/

[![Open Demo – GitHub Pages](https://img.shields.io/badge/demo-GitHub%20Pages-2ea44f?logo=github)](https://seiya-matsuoka.github.io/tetromino-fall-game/)

## スクリーンショット

<table>
  <tr>
    <td align="center">
      <a href="./docs/screenshot_1.png">
        <img src="./docs/screenshot_1.png" width="220">
      </a>
    </td>
    <td align="center">
      <a href="./docs/screenshot_2.png">
        <img src="./docs/screenshot_2.png" width="220">
      </a>
    </td>
    <td align="center">
      <a href="./docs/screenshot_3.png">
        <img src="./docs/screenshot_3.png" width="220">
      </a>
    </td>
  </tr>
  <tr>
    <td align="center">
      <a href="./docs/screenshot_4.png">
        <img src="./docs/screenshot_4.png" width="220">
      </a>
    </td>
    <td align="center">
      <a href="./docs/screenshot_5.png">
        <img src="./docs/screenshot_5.png" width="220">
      </a>
    </td>   
  </tr>
  
</table>

## 特徴

- **7バッグ**：偏りを抑えたミノ供給
- **落下（レベル制）**：L1→L20 まで段階的に加速（L20 で上限）
- **ロック遅延**：接地後一定時間で固定
- **ライン消去 & スコア**：1=100 / 2=300 / 3=500 / 4=800（合計ラインに応じて自動レベルアップ）
- **ゴースト**（着地点）表示
- **NEXT ×3** 表示
- **HUD**：スコア・ハイスコア・レベル
- **2 種のレベル UI**
  - レベル進捗ゲージ：次レベルまでの 0–10 ラインを可視化
  - レベルスタック：現在レベルを 20 段の縦バーで可視化
- **キーボード操作**
  - ←/→：移動（ホールドで自動連続）
  - ↓：ソフトドロップ（ホールドで連続）
  - ↑：タップ=右回転、長押し=左回転に変更
  - ↓ 長押し一定時間で ハードドロップ
- **タッチ/クリック操作**：画面下の 4 ボタン（回転/←/→/↓）
- **ポーズ/再開/リスタート**：右上のボタン。初期は停止状態から開始
- **ハイスコア保存**：`localStorage` に保存・読み込み

## ルール

1. ランダム（7 バッグ）で出現するミノを移動・回転して積む
2. 横 1 行が埋まると消去。同時 1–4 行消しで加点
3. 10 行ごとにレベルアップ（最大 L20）
4. 盤面上部まで積み上がるとゲームオーバー

## 操作

| 入力                        | 動作                                                    |
| :-------------------------- | :------------------------------------------------------ |
| <kbd>←</kbd> / <kbd>→</kbd> | 左右移動                                                |
| <kbd>↓</kbd>                | ソフトドロップ（リピート）／長押しでハードドロップ 1 回 |
| <kbd>↑</kbd>                | 右回転（タップ）／長押しで左回転に変更                  |
| 画面ボタン 4 つ             | 回転／←／→／↓（キー or クリック or タップ）             |
| 右上ボタン                  | 停止／再開、ゲームオーバー時はリスタート                |

## セットアップ

```bash
npm i
npm run dev
```

- 本番ビルド：`npm run build`
- プレビュー：`npm run preview`

## ディレクトリ構成

```bash
src/
├─ core/
│ ├─ store.ts     # ゲーム状態（board/active/score/level/lines/next…）
│ ├─ loop.ts      # GameLoop（update/render）
│ ├─ input.ts     # キー入力＋画面ボタン入力
│ ├─ controls.ts  # 画面ボタンと input の接続
│ ├─ collision.ts # 当たり判定・移動/接地判定
│ ├─ lines.ts     # ライン消去と下詰め
│ ├─ srs.ts       # 形状・キック
│ ├─ sevenBag.ts  # 7バッグ
│ └─ types.ts     # 型定義
├─ game/
│ ├─ gameplay.ts  # 進行ロジック（重力/ロック遅延/スポーン/スコア加算など）
│ └─ render.ts    # 描画（盤面・アクティブ・NEXT・HUD）
├─ main.ts        # 初期化（store/gameplay/renderer/loop の組み立て）
└─ style.css      # Tailwind v4

```

## 技術スタック

- **TypeScript**（**Vite**）
- **Tailwind CSS v4**

## セキュリティ / プライバシー

- ハイスコアのみブラウザの `localStorage` に保存

## デプロイ（GitHub Pages）

- `vite.config.ts` の `base` を リポジトリ名に設定
- GitHub Actions（`deploy.yml`）が `main` への push で自動デプロイ

  [![Deploy to GitHub Pages](https://github.com/seiya-matsuoka/tetromino-fall-game/actions/workflows/deploy.yml/badge.svg?branch=main)](https://github.com/seiya-matsuoka/tetromino-fall-game/actions/workflows/deploy.yml)
