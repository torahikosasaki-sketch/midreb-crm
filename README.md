# midreb 営業CRM

midreb の営業パイプライン管理を中心とした簡易CRM。複数事業・複数チャネルの商談を一元的に可視化し、「いま何が動いていて、いつ・いくらの売上が立ちそうか」を常に把握する。

主役は **商談（Deal）**。ホーム画面はフェーズ軸のカンバンで、ドラッグで進捗を更新できる。

## 技術スタック

| 領域 | 採用 |
|---|---|
| フレームワーク | Next.js 16 (App Router) + TypeScript |
| ORM | Prisma |
| DB（開発） | SQLite (`prisma/dev.db`) |
| DB（本番） | Supabase (Postgres) ※下記参照 |
| UI | Tailwind CSS v4 |
| カンバン D&D | dnd-kit |
| ホスティング | Vercel + Supabase Auth（メール認証） |

## セットアップ

```bash
npm install
npx prisma migrate dev      # DBスキーマ適用（初回はDB作成）
npm run db:seed             # Excel由来のデモデータ投入
npm run dev                 # http://localhost:3000
```

> 注: GMVが未入力だった商談には、デモ用にサンプルGMVを付与している（メモに「(GMVはサンプル値)」と表示）。

## スクリプト

- `npm run dev` — 開発サーバ
- `npm run build` — 本番ビルド
- `npm run db:seed` — `prisma/seed-data.json` からデータ投入（冪等：全削除→再投入）
- `npm run db:reset` — DBを初期化して再マイグレーション

## データモデル

```
Account (顧客企業) 1─N Deal (商談) 1─N Activity (活動ログ)
Deal N─N Talent (クリエイター/パートナー)   ※DealTalent 中間
Campaign (クリエイター管理: ブランド×商品の動画/ライブ実績)
WeeklyProgress (進捗管理: ブランド×商品×週次の実績トラッキング)
Target (目標 vs 実績)
```

- **加重売上** = 想定売上 × 確度。アプリ層（`src/lib/enums.ts: weightedRevenue`）で算出し、プロバイダ非依存。
- enum / 複数値（提供サービス）は SQLite/Postgres 両対応のため String で保持し、`src/lib/enums.ts` で値を制約。

## 主要ディレクトリ

```
prisma/schema.prisma     スキーマ定義
prisma/seed.ts           シードスクリプト
prisma/seed-data.json    Excel由来のデータ
src/lib/enums.ts         ドメインのマスター値・集計関数
src/lib/prisma.ts        Prisma クライアント
src/lib/actions/         Server Actions（deals / accounts）
src/components/          KanbanBoard / DealForm / AccountForm / Filters 等
src/app/                 ルーティング（/ = カンバン, /deals, /accounts）
```

## 本番（Supabase/Postgres）への切替

1. `prisma/schema.prisma` の datasource を `provider = "postgresql"` に変更
2. `.env` の `DATABASE_URL` を Supabase の接続文字列に変更
3. `npx prisma migrate dev` で Postgres 用マイグレーションを再生成
4. 認証は Supabase Auth（メール招待制）を `src/app` のレイアウトに組み込み、Vercel へデプロイ

## 実装状況

### P0（MVP）✅ 完了
- 商談 CRUD（フェーズ・確度・想定売上）
- フェーズ軸カンバン（ドラッグで進捗更新・楽観的更新）
- 顧客企業マスターと商談の紐付け
- 事業区分・担当者・フェーズによるフィルタ
- 加重売上の自動算出とパイプライン合計表示

### P1 ✅ 完了
- 活動ログの記録・タイムライン表示（商談詳細）
- クリエイター人材プール（`/talents`）と商談アサイン（N:N）
- 受注予定日ベースの月次パイプライン集計（`/pipeline`、Recharts積み上げ棒）
- ⏳ Supabase Auth（メール認証）— 本番化時に組み込み（Supabaseプロジェクト/鍵が必要なため保留）

### P2 ✅ 完了
- 目標 vs 実績ダッシュボード（`/targets`、フェーズ計画と現時点実績の対比バー）
- 担当者別ビュー・次回アクションリマインド（`/my`、遅延/今日/今後で分類）

### Excel更新反映（2026-07 改訂）✅ 完了
- 商談: `想定月間GMV`→`想定売上` にリネーム、`代理店名` 追加、事業区分を新名称（`TTS導入・運用支援`/`越境支援`）に
- 顧客企業: `販売目標数` 追加
- **storeb在庫（Inventory）機能は廃止**（Excelで削除予定のため。販売実績はクリエイター管理へ集約）
- クリエイター管理（`/campaigns`）: ブランド×商品単位で動画/ライブ別の実績（投稿/人数/販売/GMV）を管理
- 進捗管理（`/progress`）: ブランド×商品×週次の実績と目標差分をトラッキング

### ダッシュボード ✅ 完了
- 横断KPIダッシュボード（`/dashboard`）: KPIカード（パイプライン加重売上/想定売上合計/進行中商談/運用中GMV/受注・運用中/アクション遅延）＋ フェーズ別ファネル・事業区分別構成比・月次見込み・担当者別 加重売上のチャート、目標達成率、クリエイター実績、直近の要対応

### 今後（運用フェーズ）
- ⏳ Supabase Auth（メール認証）+ Vercel デプロイ（鍵が必要なため保留）
