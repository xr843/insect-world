-- 墙的初始候选项。
--
--   npx wrangler d1 execute insect-world --remote --file=db/seed.sql
--
-- 用 INSERT OR IGNORE：重复执行不会把已有票数清零，也不会报错。
--
-- ── 这几项是怎么挑的 ──────────────────────────────────────────────────
--
-- 2026-09-07 拉的 Umami 近 30 天数据：63 种里只有 13 种有 3D 生活史，而流量
-- 前 7（帝王蝶 3156、蜜蜂 1796、螳螂 1606、瓢虫 1478、蜻蜓 1288、独角仙 987、
-- 蚂蚁 928）**全都已经有了**。高价值的生活史工作已经做完，"下一个补谁"因此
-- 真的是盲的 —— 这正是要交给票来定的原因。
--
-- 下面六个物种是「还没有 3D 生活史、但浏览量最高」的前六名，后面括号是当时
-- 的 30 天浏览量。另外三项来自已知诉求，不是猜的：实拍图是 issue #3 那位老师
-- 提的（也是 README 里"AI 撰写未核校"这道课堂采用门槛的正面回应）。
--
-- 时间戳用固定值而不是 unixepoch()：同票时按 created_at 排序（见 sortWishes），
-- 种子若都取当前时刻，同一秒内插入的几项次序就取决于执行顺序，不稳定。
-- 这里按上面的流量顺序给递增值，同票时高流量项排前面。

INSERT OR IGNORE INTO wishes (id, kind, title_zh, title_en, votes, listed, created_at) VALUES
  ('lifecycle-cockroach',     'lifecycle', '德国小蠊的生活史',   'German Cockroach life cycle',    0, 1, 1),
  ('lifecycle-tiger-beetle',  'lifecycle', '中华虎甲的生活史',   'Chinese Tiger Beetle life cycle',0, 1, 2),
  ('lifecycle-stag-beetle',   'lifecycle', '中华大锹甲的生活史', 'Chinese Stag Beetle life cycle',  0, 1, 3),
  ('lifecycle-swallowtail',   'lifecycle', '玉带凤蝶的生活史',   'Common Mormon life cycle',        0, 1, 4),
  ('lifecycle-house-fly',     'lifecycle', '家蝇的生活史',       'House Fly life cycle',            0, 1, 5),
  ('lifecycle-stick-insect',  'lifecycle', '棒䗛的生活史',       'Asian Stick Insect life cycle',   0, 1, 6),
  ('feature-photos',          'feature',   '配上实拍对照图',     'Add real photos side by side',    0, 1, 7),
  ('species-new',             'species',   '再添一个新物种',     'Add another species',             0, 1, 8),
  ('feature-en',              'feature',   '把英文版补齐',       'Finish the English edition',      0, 1, 9);
