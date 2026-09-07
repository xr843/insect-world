-- 反馈系统的 D1 结构。
--
-- 应用一次：
--   npx wrangler d1 execute insect-world --remote --file=db/schema.sql
-- 本地开发库（wrangler pages dev 用的那份）把 --remote 换成 --local。
--
-- 全部用 IF NOT EXISTS，重复执行安全 —— 这个文件会被反复手敲，不能是一次性的。

-- ── 候选项：墙上可投票的心愿，完全由作者控制 ──────────────────────────
--
-- 访客不能凭空创建候选项（自由填的心愿进 messages，由 inbox:promote 人工升格）。
-- 这是「只公开聚合数 + 人工精选」这条决策在数据层的第一个落点。
CREATE TABLE IF NOT EXISTS wishes (
  id         TEXT PRIMARY KEY,
  kind       TEXT NOT NULL,                 -- 'lifecycle' | 'species' | 'feature'
  title_zh   TEXT NOT NULL,
  title_en   TEXT NOT NULL,
  votes      INTEGER NOT NULL DEFAULT 0,
  listed     INTEGER NOT NULL DEFAULT 1,    -- 0 = 下架，不上墙但保留票数
  created_at INTEGER NOT NULL
);

-- 墙的默认查询是「上架的、按票数降序」，走这条索引不用全表扫。
CREATE INDEX IF NOT EXISTS idx_wishes_listed_votes ON wishes (listed, votes DESC);

-- ── 提交：纠错 / 自由心愿 / 随便说一句 ────────────────────────────────
--
-- status 的默认值是 'new'，且**没有任何代码路径**能把它自动改成 'featured'
-- —— 上墙只能由 scripts/inbox.mjs 人工执行。这是第二个落点。
CREATE TABLE IF NOT EXISTS messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL,
  kind       TEXT NOT NULL,                 -- 'correction' | 'wish' | 'note'
  species    TEXT,                          -- 物种 id，纠错必带
  part       TEXT,                          -- 部位 key，可空
  body       TEXT NOT NULL,
  email      TEXT,                          -- 选填，永不公开
  locale     TEXT NOT NULL,
  ip_hash    TEXT NOT NULL,                 -- 按天轮换，见 src/feedback/rules.ts
  status     TEXT NOT NULL DEFAULT 'new'    -- 'new' | 'featured' | 'hidden'
);

-- 限流查的是「今天这个 ip_hash 提交过几次」。ip_hash 已含日期，所以单列足够。
CREATE INDEX IF NOT EXISTS idx_messages_ip ON messages (ip_hash);
-- 收件箱与墙都按 status 过滤后按时间排。
CREATE INDEX IF NOT EXISTS idx_messages_status_time ON messages (status, created_at DESC);

-- ── 投票去重 ──────────────────────────────────────────────────────────
--
-- 主键就是去重规则本身：同一个 ip_hash 对同一个候选项只能有一行。因为 ip_hash
-- 按天轮换，这个约束的实际语义是「每人每天每项一票」——隔天可以再投，这是
-- 刻意接受的代价（换来不长期保存可关联的访客标识，理由见 rules.ts 的 ipHashInput）。
CREATE TABLE IF NOT EXISTS votes (
  wish_id    TEXT NOT NULL,
  ip_hash    TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (wish_id, ip_hash)
);
