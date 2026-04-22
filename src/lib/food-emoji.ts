const RULES: Array<{ test: RegExp; emoji: string }> = [
  { test: /(밥|공기밥|볶음밥|비빔밥|덮밥|주먹밥)/, emoji: "🍚" },
  { test: /(국|탕|찌개|전골|라면|우동|국수|파스타|스프|수프)/, emoji: "🍜" },
  { test: /(김치|깍두기|단무지|피클|반찬|무침|나물|샐러드)/, emoji: "🥬" },
  { test: /(고기|스테이크|삼겹살|돼지|소불고기|갈비|불고기|제육)/, emoji: "🥩" },
  { test: /(닭|치킨|윙|너겟)/, emoji: "🍗" },
  { test: /(생선|회|연어|참치|고등어|삼치|장어|광어|우럭)/, emoji: "🐟" },
  { test: /(새우|게|랍스터|오징어|문어|낙지|해물|홍합|조개)/, emoji: "🦐" },
  { test: /(초밥|스시|김밥|롤)/, emoji: "🍣" },
  { test: /(떡볶이|떡)/, emoji: "🍢" },
  { test: /(만두|교자|군만두|찐만두)/, emoji: "🥟" },
  { test: /(전|파전|부침개|빈대떡|호떡)/, emoji: "🥞" },
  { test: /(계란|달걀|오믈렛|스크램블)/, emoji: "🥚" },
  { test: /(두부|순두부|유부)/, emoji: "🧈" },
  { test: /(피자)/, emoji: "🍕" },
  { test: /(햄버거|버거)/, emoji: "🍔" },
  { test: /(샌드위치|토스트|베이글)/, emoji: "🥪" },
  { test: /(타코|부리또)/, emoji: "🌮" },
  { test: /(핫도그|소시지|프랑크)/, emoji: "🌭" },
  { test: /(감자|감자튀김|프렌치프라이)/, emoji: "🍟" },
  { test: /(빵|크루아상|바게트)/, emoji: "🥐" },
  { test: /(케이크|케익|롤케이크|티라미수)/, emoji: "🍰" },
  { test: /(쿠키|비스킷|마카롱)/, emoji: "🍪" },
  { test: /(도넛|도너츠)/, emoji: "🍩" },
  { test: /(아이스크림|젤라또|소프트콘)/, emoji: "🍦" },
  { test: /(초콜릿|초코)/, emoji: "🍫" },
  { test: /(사탕|캔디|젤리)/, emoji: "🍬" },
  { test: /(딸기)/, emoji: "🍓" },
  { test: /(바나나)/, emoji: "🍌" },
  { test: /(사과)/, emoji: "🍎" },
  { test: /(포도)/, emoji: "🍇" },
  { test: /(수박)/, emoji: "🍉" },
  { test: /(복숭아|자두|망고)/, emoji: "🍑" },
  { test: /(오렌지|귤|레몬)/, emoji: "🍊" },
  { test: /(파인애플)/, emoji: "🍍" },
  { test: /(커피|아메리카노|라떼|에스프레소)/, emoji: "☕️" },
  { test: /(차|녹차|홍차|티)/, emoji: "🍵" },
  { test: /(우유|밀크)/, emoji: "🥛" },
  { test: /(주스|스무디|에이드|쉐이크)/, emoji: "🥤" },
  { test: /(맥주|생맥주)/, emoji: "🍺" },
  { test: /(소주|와인|막걸리|칵테일)/, emoji: "🍷" },
  { test: /(요거트|요구르트)/, emoji: "🍶" },
  { test: /(치즈)/, emoji: "🧀" },
  { test: /(견과|땅콩|아몬드|호두|캐슈)/, emoji: "🥜" },
  { test: /(브로콜리|양배추|상추)/, emoji: "🥦" },
  { test: /(당근)/, emoji: "🥕" },
  { test: /(옥수수)/, emoji: "🌽" },
  { test: /(버섯)/, emoji: "🍄" },
  { test: /(과자|스낵|칩)/, emoji: "🥨" },
  { test: /(팝콘)/, emoji: "🍿" },
];

export const EMOJI_PALETTE: string[] = [
  "🍚", "🍜", "🍲", "🍛", "🥗",
  "🥩", "🍗", "🐟", "🍣", "🥟",
  "🍕", "🍔", "🍝", "🥪", "🌮",
  "🍰", "🍩", "🍎", "☕️", "🍽️",
];

export function foodEmoji(name: string): string {
  for (const { test, emoji } of RULES) {
    if (test.test(name)) return emoji;
  }
  return "🍽️";
}

export function displayFoodName(name: string): string {
  return name.replace(/_/g, " ").trim();
}
