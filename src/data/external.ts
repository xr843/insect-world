/**
 * 实物照片外链 —— 物种 id → iNaturalist taxon id。
 *
 * 为什么存 id 而不是运行时拼学名：拼学名走模糊搜索会**理直气壮地链错**。
 * 实测过一轮，`Anatolica sp.`（甘肃鳖甲）搜出来的第一条是 Silene csereii，
 * 一种开花植物；`Hister sp.` 漂到了 Staphyliniformia 下目。这类错误页面不报错、
 * 没人会发现，直到被人当众指出来。所以 id 在构建期解析、校验学名精确一致
 * 且 rank 符合预期（种级查询只收 species/complex，属级只收 genus），再落到这里。
 *
 * 60 种里有 2 种**故意没有链接**：
 * - 中华豆芫菁 Epicauta chinensis —— iNat 只有 Epicauta sibirica，是**另一个种**
 * - 猎蝽 Sycanus croceovittatus —— iNat 只有 Sycanus bifidus，同理
 * 宁可这两条不显示「看实物照片」，也不能把人送到错的物种页去。
 *
 * 另有 2 种链接指向的属名与本图鉴不同（见下方注释），那是数据库之间的属级
 * 归置分歧，种加词一致、指的是同一种动物，链过去正确。
 *
 * 学名本身经 GBIF 分类学骨干库交叉核对过（2026-08-12）。
 */

/** 物种 id → iNaturalist taxon id；未收录的物种不出现在此表中 */
export const INAT_TAXA: Record<string, number> = {
  'ant': 321673,
  'bombardier-beetle': 333069,
  'bumblebee': 1092510,
  'burying-beetle': 880881,
  'caddisfly': 177448,
  'checkered-beetle': 560752,
  'cicada': 319989,
  'click-beetle': 560574,
  'crane-fly': 60393,
  'cricket': 146737,
  'damselfly': 52054,
  'darkling-beetle': 1039230,
  'dead-leaf-butterfly': 67980,
  'diving-beetle': 711876,
  'dobsonfly': 956161,
  'dragonfly': 94048,
  'dung-beetle': 333465,
  'earwig': 307026,
  'firefly': 1225564,
  'flower-chafer': 471169,
  'goliath-beetle': 468105,
  'ground-beetle': 56553,
  'hawk-moth': 56293,
  'hercules-beetle': 1502695,
  'hister-beetle': 131121,
  'honeybee': 47219,
  'hornet': 322284,
  'hoverfly': 52482,
  'ichneumon-wasp': 47935,
  'jewel-beetle': 360062,
  'katydid': 560792,
  'lacewing': 362814,
  'ladybird': 51702,
  'leaf-beetle': 743384,  // Pyrrhalta aenescens → iNat 作 Xanthogaleruca aenescens（属级归置不同，同一物种）
  'locust': 201627,
  'longhorn-beetle': 199326,
  'mantidfly': 252661,
  'mantis': 71034,
  'mole-cricket': 118894,
  'monarch-butterfly': 48662,
  'net-winged-beetle': 355413,
  'orchid-mantis': 460388,
  'rhinoceros-beetle': 324733,
  'robber-fly': 361062,
  'rove-beetle': 355545,
  'shining-chafer': 902613,
  'silk-moth': 124121,
  'stag-beetle': 361707,
  'stick-insect': 340007,
  'swallowtail': 51588,
  'termite-soldier': 492045,
  'tiger-beetle': 1661876,  // Cicindela chinensis → iNat 作 Sophiodela chinensis（属级归置不同，同一物种）
  'tortoise-beetle': 126320,
  'treehopper': 337777,
  'water-scavenger': 499267,
  'water-strider': 360899,
  'weevil': 929579,
  'whirligig-beetle': 178028,
}

/** 拼出 iNaturalist 物种页地址；没有对应记录时返回 null（调用方据此不渲染入口） */
export function photoUrl(insectId: string): string | null {
  const taxon = INAT_TAXA[insectId]
  return taxon ? `https://www.inaturalist.org/taxa/${taxon}` : null
}
