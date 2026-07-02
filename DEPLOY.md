# デプロイ手順（Supabase + Vercel）

認証（Supabase Auth）は今回スコープ外。DB を Supabase(Postgres) に接続し、Vercel にデプロイする。

## 前提
- スキーマは `postgresql` に切替済み（`prisma/schema.prisma`）
- Postgres 用マイグレーション生成済み（`prisma/migrations/0_init/migration.sql`）
- `build` で `prisma generate` を実行、`postinstall` でも生成（Vercel対応済み）

---

## 1. Supabase プロジェクト作成 & 接続情報取得

1. https://supabase.com でプロジェクトを作成（リージョンは東京 `ap-northeast-1` 推奨）
2. Project Settings > Database > **Connection string** を開く
3. 2種類の接続文字列を控える（`[PASSWORD]` はプロジェクト作成時のDBパスワード）:
   - **Transaction pooler**（port `6543`）→ `DATABASE_URL`。末尾に `?pgbouncer=true` を付与
   - **Direct connection**（port `5432`）→ `DIRECT_URL`

`.env`（ローカル）に設定:
```
DATABASE_URL="postgresql://postgres.xxxx:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.xxxx:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres"
```

## 2. マイグレーション適用 & 初期データ投入
```bash
npx prisma migrate deploy   # 0_init を Supabase に適用
npm run db:seed             # デモデータ投入（本番は任意。空で始めるならスキップ）
```

## 3. Vercel デプロイ

### 方法A: GitHub 連携（推奨）
1. リポジトリを GitHub に push
2. https://vercel.com で「New Project」→ 該当リポジトリを import
3. **Environment Variables** に `DATABASE_URL` と `DIRECT_URL` を設定（Production / Preview 両方）
4. Deploy（Framework: Next.js は自動検出。Build Command はデフォルトでOK）

### 方法B: Vercel CLI
```bash
npm i -g vercel
vercel login
vercel link
vercel env add DATABASE_URL production   # 値を貼付
vercel env add DIRECT_URL production
vercel --prod
```

## 4. 動作確認
- デプロイURLで `/dashboard`・`/`（カンバン）が表示され、データが読めること
- 商談のドラッグ、CRUD が保存されること

---

## メモ
- Vercel（サーバーレス）は Pooler(6543) 経由で接続する必要があるため `DATABASE_URL` に pooler を使う。マイグレーションは直結(5432)の `DIRECT_URL` を使う。
- 認証を後で入れる場合は Supabase Auth（メール招待制）を `src/app/layout.tsx` 前段に組み込む。
