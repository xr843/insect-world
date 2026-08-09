#!/usr/bin/env bash
# 生成分享卡 public/og.png（1200×630）——微信/QQ/Twitter 抓的就是这张图。
#
# 为什么用 ImageMagick 而不是截图：og 卡不是页面截图，是一张设计卡片
# （纸感底 + 珊瑚叶徽 + 三行字）。做成脚本是因为物种数会变，上一版硬写着
# 「50 种」一直挂到 60 种时代才被发现。改数量只改下面的 SUBTITLE。
#
# ⚠️ 两个只有实跑才知道的坑：
#  1. ImageMagick 解析 SVG 的 linearGradient 会渲染成黑块（favicon 也栽过），
#     所以圆盘用 IM 自己的 radial-gradient + 圆形遮罩画，SVG 只留纯色叶片。
#  2. WSL 里没有像样的中文字体（只有 Droid Sans Fallback），但 Windows 侧
#     的 /mnt/c/Windows/Fonts 可直接读，那里正好有站点在用的 Noto Sans/Serif SC。
#     换机器跑不通就先查这两个路径。
set -euo pipefail
cd "$(dirname "$0")/.."

SERIF=/mnt/c/Windows/Fonts/NotoSerifSC-VF.ttf
SANS=/mnt/c/Windows/Fonts/NotoSansSC-VF.ttf
for f in "$SERIF" "$SANS"; do
  [ -r "$f" ] || { echo "缺字体：$f（见脚本头注释）" >&2; exit 1; }
done

TITLE='昆虫世界'
SUBTITLE='60 种昆虫的可交互 3D 图鉴'
TAGLINE='旋转 · 剖切 · 标注点 —— 像博物学家一样观察'

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

# 叶片：纯色 SVG（渐变交给 IM），尺寸对齐圆盘
cat > "$TMP/leaf.svg" <<'SVG'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="300" height="300">
  <path transform="translate(12 12.4) scale(0.72) translate(-12 -13.4)" fill="#f7f8f4"
    d="M4.2 20.2c-.5-7.8 4.6-13.3 15.6-13.6.5 8.9-4.4 13.6-12.4 13.6h-2c1.9-3.4 4.6-5.8 8.2-7.4-4.1 1.1-7.2 3.6-9.4 7.4Z"/>
</svg>
SVG
convert -background none "$TMP/leaf.svg" "$TMP/leaf.png"

# 圆盘：青铜径向渐变 + 圆形遮罩（两套主题共同的身份色，与 favicon 同源）
convert -size 300x300 radial-gradient:'#a9873f'-'#6f5622' "$TMP/disc-fill.png"
convert -size 300x300 xc:none -fill white -draw 'circle 150,150 150,0' "$TMP/disc-mask.png"
convert "$TMP/disc-fill.png" "$TMP/disc-mask.png" \
  -alpha off -compose CopyOpacity -composite "$TMP/disc.png"
composite "$TMP/leaf.png" "$TMP/disc.png" "$TMP/badge.png"

# 档案衬板底：左上偏亮、右下偏沉，与站点 body 的两层径向渐变同调
convert -size 1200x630 gradient:'#f6f8f2'-'#e0e5da' -rotate 0 "$TMP/bg.png"
convert "$TMP/bg.png" \
  \( -size 1200x630 radial-gradient:'#fffefb'-'#f7f0e7' -alpha set -channel A \
     -evaluate multiply 0.55 +channel \) -composite "$TMP/canvas.png"

# 标题描边 1.1px 是在补字重：ImageMagick 用不了可变字体的 weight 轴，
# NotoSerifSC-VF 默认渲成 Regular，而站点 h1 是 500 —— 卡片被平台缩成
# 缩略图时，细笔画的中文会糊成一团。描边把它拉回视觉上的 Medium。
# -depth 8 同样不是可选项：默认 16 位让这张图 850KB（原版 245KB）。
convert "$TMP/canvas.png" \
  "$TMP/badge.png" -geometry +96+165 -composite \
  -font "$SERIF" -pointsize 96 -fill '#23282a' -stroke '#23282a' -strokewidth 1.1 \
  -annotate +452+270 "$TITLE" \
  -stroke none \
  -font "$SANS" -pointsize 38 -fill '#3c4446' \
  -annotate +452+352 "$SUBTITLE" \
  -font "$SANS" -pointsize 27 -fill '#3f5199' \
  -annotate +452+430 "$TAGLINE" \
  -depth 8 -strip public/og.png


# 图标三件套复用同一个圆盘：favicon.svg 是手写源（渐变给浏览器看），
# 位图版从 IM 画的圆盘导出，避免 SVG 渐变被渲成黑块。
convert "$TMP/badge.png" -resize 180x180 -depth 8 -strip public/apple-touch-icon.png
convert "$TMP/badge.png" -resize 48x48 -depth 8 -strip public/favicon.ico

identify public/og.png public/apple-touch-icon.png public/favicon.ico
