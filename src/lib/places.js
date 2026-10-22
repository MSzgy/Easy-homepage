// Display names for visitor origins (country codes and first-level regions
// from Cloudflare). Country names come from the browser; Chinese provinces get
// their Chinese names here, everything else keeps Cloudflare's English name.

// ISO 3166-2:CN code, English name prefix(es), Chinese name.
const CN_REGIONS = [
  ["AH", ["anhui"], "安徽"], ["BJ", ["beijing"], "北京"], ["CQ", ["chongqing"], "重庆"],
  ["FJ", ["fujian"], "福建"], ["GD", ["guangdong"], "广东"], ["GS", ["gansu"], "甘肃"],
  ["GX", ["guangxi"], "广西"], ["GZ", ["guizhou"], "贵州"], ["HA", ["henan"], "河南"],
  ["HB", ["hubei"], "湖北"], ["HE", ["hebei"], "河北"], ["HI", ["hainan"], "海南"],
  ["HL", ["heilongjiang"], "黑龙江"], ["HN", ["hunan"], "湖南"], ["JL", ["jilin"], "吉林"],
  ["JS", ["jiangsu"], "江苏"], ["JX", ["jiangxi"], "江西"], ["LN", ["liaoning"], "辽宁"],
  ["NM", ["inner mongolia", "nei mongol"], "内蒙古"], ["NX", ["ningxia"], "宁夏"],
  ["QH", ["qinghai"], "青海"], ["SC", ["sichuan"], "四川"], ["SD", ["shandong"], "山东"],
  ["SH", ["shanghai"], "上海"], ["SN", ["shaanxi"], "陕西"], ["SX", ["shanxi"], "山西"],
  ["TJ", ["tianjin"], "天津"], ["XJ", ["xinjiang"], "新疆"], ["XZ", ["tibet", "xizang"], "西藏"],
  ["YN", ["yunnan"], "云南"], ["ZJ", ["zhejiang"], "浙江"],
];

const displayNames = new Map();

// "short" suits lists and charts ("US"); "long" reads better in a sentence.
export function countryName(code, lang, style = "short") {
  if (code === "T1") return "Tor";
  const key = `${lang}:${style}`;
  if (!displayNames.has(key)) displayNames.set(key, new Intl.DisplayNames([lang], { type: "region", style }));
  try {
    return displayNames.get(key).of(code);
  } catch {
    return code;
  }
}

// region: [country, region code, English name, count] as published in status.json.
export function regionName([country, code, name], lang) {
  if (country === "CN" && lang.startsWith("zh")) {
    const lower = name.toLowerCase();
    const match = CN_REGIONS.find(([id, names]) => id === code || names.some((prefix) => lower.startsWith(prefix)));
    if (match) return match[2];
  }
  return name;
}
