// Rough Japanese-supermarket walking order, used to auto-sort the shopping
// list so items appear roughly in the order you'd pick them up in-store.
const SECTIONS = [
  {
    label: '野菜・果物',
    keywords: [
      '野菜', 'ねぎ', 'ネギ', '玉ねぎ', 'たまねぎ', 'にんじん', '人参', 'じゃがいも', 'ジャガイモ',
      'キャベツ', '白菜', '大根', 'きゅうり', 'トマト', 'なす', 'ナス', 'ピーマン', 'もやし',
      'れんこん', 'ごぼう', 'かぼちゃ', 'しめじ', 'えのき', 'きのこ', 'しいたけ', 'まいたけ',
      'にんにく', 'しょうが', '生姜', 'レモン', 'りんご', 'バナナ', 'セロリ', 'パプリカ',
      'アスパラ', 'ブロッコリー', 'ほうれん草', '小松菜', 'にら', '豆苗', '枝豆', 'さつまいも',
      '里芋', 'スナップエンドウ', '大葉', 'みょうが', 'レタス', 'かいわれ', 'パセリ', 'ハーブ',
    ],
  },
  {
    label: '精肉',
    keywords: ['肉', '豚', '牛', '鶏', 'ひき肉', 'ベーコン', 'ハム', 'ソーセージ', '手羽', '牛脂'],
  },
  {
    label: '魚介',
    keywords: [
      '魚', '鮭', 'サバ', '鯖', 'あさり', 'えび', '海老', 'イカ', 'いか', 'タコ', 'たこ',
      'ホタテ', 'ぶり', '鯛', 'いわし', 'さんま', 'かれい', 'たら', '貝', 'カジキ', 'めかじき',
    ],
  },
  {
    label: '卵・乳製品・豆腐',
    keywords: [
      '卵', '牛乳', 'チーズ', 'ヨーグルト', 'バター', '豆腐', '油揚げ', '厚揚げ', '納豆', '豆乳', '生クリーム',
    ],
  },
  {
    label: '米・麺・パン',
    keywords: ['米', 'パン', 'うどん', 'そば', 'パスタ', '麺', 'もち米', '玄米', '餅'],
  },
  {
    label: '調味料・乾物・油',
    keywords: [
      'しょうゆ', '醤油', 'みそ', '味噌', '砂糖', '塩', '酢', '酒', 'みりん', '油', 'だし',
      'コンソメ', 'ケチャップ', 'マヨネーズ', 'ソース', '片栗粉', '小麦粉', 'こしょう', 'ごま',
      'ポン酢', 'わさび', 'からし', '缶', '乾燥', 'かつお節', '昆布', 'カレー粉', 'こんにゃく',
    ],
  },
]

/** Returns a sort key (lower = earlier in the store walk) for an ingredient name. */
export function groceryOrderKey(name) {
  for (let i = 0; i < SECTIONS.length; i++) {
    if (SECTIONS[i].keywords.some((k) => name.includes(k))) return i
  }
  return SECTIONS.length // unmatched -> last (その他)
}

/** Sort a list of {name, ...} items into supermarket-friendly order (stable). */
export function sortByGroceryOrder(items) {
  return items
    .map((item, index) => ({ item, index, key: groceryOrderKey(item.name) }))
    .sort((a, b) => (a.key - b.key) || (a.index - b.index))
    .map((x) => x.item)
}
