/* 손님 데이터 · 일차별 난이도 곡선 · 손님 생성기 */
(function () {
  const A = (window.Atelier = window.Atelier || {});

  /* ---------- 일차별 난이도 곡선 (기획서 p.48) ---------- */
  // count: 손님 수 / items: 제작 가능 아이템 / neg: 부정 방향 의뢰 허용 / multi: 복수 축 의뢰 수
  A.DAY_TABLE = [
    null,
    { count: 3, items: ['potion'], neg: false, multi: 0 },
    { count: 4, items: ['potion', 'charm'], neg: false, multi: 0 },
    { count: 4, items: ['potion', 'charm', 'doll'], neg: true, multi: 0 },
    { count: 5, items: ['potion', 'charm', 'doll'], neg: true, multi: 1 },
    { count: 5, items: ['potion', 'charm', 'doll'], neg: true, multi: 1 },
    { count: 5, items: ['potion', 'charm', 'doll'], neg: true, multi: 2 },
    { count: 6, items: ['potion', 'charm', 'doll'], neg: true, multi: 2 },
    { count: 6, items: ['potion', 'charm', 'doll'], neg: true, multi: 3 },
    { count: 6, items: ['potion', 'charm', 'doll'], neg: true, multi: 3 },
    { count: 7, items: ['potion', 'charm', 'doll'], neg: true, multi: 4 },
  ];
  A.MAX_TABLE_DAY = 10;
  A.NEG_PER_DAY_LIMIT = 5; // 부정 방향 아이템은 하루 5회까지
  A.dayConfig = (day) => A.DAY_TABLE[Math.min(day, A.MAX_TABLE_DAY)];

  /* 손님 유형: 나이 3 × 성별 2 = 6유형 (character_1.png ~ character_6.png) */
  A.CUSTOMER_TYPES = [
    { id: 1, age: 'young', gender: 'm', label: '젊은 남성' },
    { id: 2, age: 'young', gender: 'f', label: '젊은 여성' },
    { id: 3, age: 'old', gender: 'm', label: '중년~노년 남성' },
    { id: 4, age: 'old', gender: 'f', label: '중년~노년 여성' },
    { id: 5, age: 'child', gender: 'm', label: '아이 남' },
    { id: 6, age: 'child', gender: 'f', label: '아이 여' },
  ];

  /* ---------- 대사 ---------- */
  const GREET_ADULT = [
    '날이 참 좋네요, 그렇죠?',
    '저... 여기가 소문의 그 아틀리에 맞나요?',
    '밤늦게 죄송합니다. 잠깐 시간 괜찮으세요?',
    '촛불이 참 분위기 있네요.',
    '여기는 처음 와보는데, 신기한 물건이 참 많네요.',
    '실례합니다... 부탁드릴 일이 있어서요.',
  ];
  const GREET_CHILD = [
    '안녕하세요! 여기 진짜 마법 가게예요?',
    '저 혼자 왔어요. 용기 냈어요!',
    '우와, 반짝이는 공이다!',
  ];

  // 단일 축 의뢰: [줄1, 줄2, 강조줄]
  const SINGLE = {
    'wealth+': [
      ['가게 월세가 석 달째 밀렸어요.', '이러다 길바닥에 나앉게 생겼지 뭐예요.', '돈 걱정 없이 살아봤으면...'],
      ['복권을 사도 사도 꽝이에요.', '제가 운이 없는 건지, 복이 없는 건지...', '주머니가 두둑해지는 날이 오긴 올까요?'],
      ['동생 결혼식에 축의금 낼 형편이 안 돼요.', '체면이 말이 아니죠.', '돈이 굴러들어오는 물건이 필요해요.'],
      ['새 장사를 시작하려는데 밑천이 모자라서요.', '은행은 문전박대였고요.', '재물운 좀 틔워주세요.'],
    ],
    'wealth-': [
      ['제 돈을 떼먹고 도망간 놈이 있어요.', '그놈 지갑이 텅텅 비어버렸으면 좋겠어요.', '거지꼴이 되도록 말이죠.'],
      ['옆집 사업가가 자꾸 제 가게 손님을 빼앗아가요.', '그 집 금고에 구멍이라도 났으면...', '쫄딱 망해버렸으면 좋겠어요.'],
      ['전 연인이 새 애인에게 비싼 선물을 퍼주고 있더군요.', '그 돈줄이 말라버리면 속이 시원하겠어요.', '가난의 맛을 좀 보여주세요.'],
    ],
    'health+': [
      ['토끼가 아파요.', '5년만 더 살아도 소원이 없을 텐데...', '이 아이를 낫게 해주세요.'],
      ['어머니가 몇 달째 자리보전을 하고 계세요.', '병원에서도 손을 놓았다고 하고...', '다시 일어나실 수 있게 도와주세요.'],
      ['밤마다 기침이 멎질 않아요.', '잠을 못 자니 일도 손에 안 잡히고요.', '몸이 가뿐해지게 해주세요.'],
      ['요즘 계단만 올라도 숨이 차네요.', '나이는 못 속인다지만 서글퍼서...', '젊을 때처럼 튼튼해지고 싶어요.'],
    ],
    'health-': [
      ['저를 괴롭히던 상사가 이번 주에 휴가를 갔어요.', '돌아오자마자 앓아누웠으면 좋겠어요.', '된통 감기라도 걸려라 싶네요.'],
      ['이웃집 개가 밤새 짖어서 한숨도 못 잤어요.', '주인이 혼쭐이 나도록 골골거렸으면...', '따끔한 맛을 보여주고 싶어요.'],
      ['저를 배신한 동업자가 아주 건강하게 잘 산대요.', '그 꼴을 두 눈 뜨고 볼 수가 없어요.', '시름시름 앓게 해주세요.'],
    ],
    'achieve+': [
      ['내일이 승진 심사예요.', '3년을 밤낮없이 일했는데 불안해서 잠이 안 와요.', '제 노력이 빛을 보게 해주세요.'],
      ['공모전에 열 번째 도전이에요.', '이번에도 떨어지면 붓을 꺾을 생각이에요.', '이번만큼은 꼭 합격하고 싶어요.'],
      ['가게 개업식이 이번 주말이에요.', '첫 단추를 잘 끼워야 할 텐데...', '모든 일이 술술 풀리면 좋겠어요.'],
      ['달리기 대회 결승선이 코앞인데 자신이 없어요.', '연습은 충분히 했는데 긴장이 돼서...', '우승 한번 해보고 싶어요!'],
    ],
    'achieve-': [
      ['라이벌이 내일 중요한 발표를 앞두고 있어요.', '그 사람 일이 모조리 틀어졌으면 해요.', '좌절이 뭔지 한번 알았으면...'],
      ['우리 팀 에이스가 자꾸 제 공을 가로채요.', '한번쯤은 크게 넘어져 봤으면...', '의욕이 꺾여 버렸으면 좋겠어요.'],
      ['소문난 천재 화가가 우리 동네에 이사 왔어요.', '그 사람 붓이 부러져 버렸으면...', '슬럼프가 한번 오길 바라요.'],
    ],
    'love+': [
      ['좋아하는 사람이 있는데 말도 못 걸겠어요.', '매일 같은 버스를 타면서 눈만 마주쳐요.', '제 마음이 닿았으면 좋겠어요.'],
      ['남편이랑 요즘 대화가 없어요.', '한 지붕 아래 남남 같달까...', '예전처럼 다정해지고 싶어요.'],
      ['이사 온 지 한 달인데 친구가 한 명도 없어요.', '외롭다는 말도 못 하겠고...', '따뜻한 인연이 생기면 좋겠어요.'],
      ['딸이 사춘기라 저와 말을 안 해요.', '예전엔 엄마 껌딱지였는데...', '마음을 열어줬으면 좋겠어요.'],
    ],
    'love-': [
      ['저를 차버린 전 애인이 곧 결혼한대요.', '축하는커녕 이가 갈려요.', '그 사랑이 싸늘하게 식어버렸으면 해요.'],
      ['제 친구가 제 애인을 넘보는 것 같아요.', '두 사람 사이가 틀어져 버렸으면...', '정이 뚝 떨어지게 해주세요.'],
      ['자꾸 집에 찾아오는 이웃 아주머니가 있어요.', '정이 넘치는 건 알겠는데 너무 부담스러워서...', '저한테서 마음이 멀어졌으면 해요.'],
    ],
  };

  // 아이 손님 (긍정 방향 · 단일 축만)
  const CHILD = {
    'wealth+': [['새 장난감이 갖고 싶은데 용돈이 없어요.', '엄마가 안 사줘요...', '용돈이 팍팍 나왔으면 좋겠어요!']],
    'health+': [['강아지가 아파서 밥을 안 먹어요.', '오래오래 같이 살고 싶은데...', '빨리 낫게 해주세요!']],
    'achieve+': [['내일 달리기 시합이 있어요.', '꼴찌 하면 너무 창피해요.', '일등 하게 해주세요!']],
    'love+': [['짝꿍이 저랑 안 놀아줘요.', '같이 소꿉놀이하고 싶은데...', '친하게 지내고 싶어요.']],
  };

  // 복수 축 의뢰: 요청한 모든 축이 기준을 넘어야 해당 등급. needs 순서 = 수정구 공개 순서
  const MULTI = [
    { needs: ['achieve-', 'wealth-'], lines: ['직장에서 상사가 날 잘라서 백수가 됐어요.', '강아지 수술비 낼 돈도 없어 죽겠네요.', '그 인간이 똑같이 당하면 좋으련만...'] },
    { needs: ['health+', 'wealth+'], lines: ['장사하다 허리를 다쳤어요.', '그런데 돈도 못 벌고 병원비만 나가고...', '몸도 지갑도 가뿐해지면 좋겠어요.'] },
    { needs: ['love+', 'health+'], lines: ['아내가 아픈데 곁에서 해줄 게 없네요.', '그래도 이번 겨울은 함께 따뜻하게 보내고 싶어요.', '건강하고, 다정한 겨울이면 좋겠어요.'] },
    { needs: ['achieve+', 'wealth+'], lines: ['작은 공방을 차렸는데 손님이 통 없어요.', '솜씨는 자신 있거든요.', '이름도 날리고 돈도 벌고 싶어요.'] },
    { needs: ['love-', 'health-'], lines: ['바람피운 남편이 있어요.', '그 사람에게서 정도, 건강도 사라져버렸으면...', '후회하게 만들고 싶어요.'] },
    { needs: ['health+', 'achieve+'], lines: ['재활 치료 중인 선수예요.', '몸이 낫고 다시 경기에 서고 싶어요.', '건강하게, 그리고 이기게 해주세요.'] },
    { needs: ['wealth+', 'love+'], lines: ['가난한 연인과 결혼을 앞두고 있어요.', '행복하고 싶은데 현실이 무겁네요.', '사랑도 살림도 넉넉했으면 좋겠어요.'] },
    { needs: ['wealth-', 'love-'], lines: ['제 재산을 노리고 접근한 사기꾼이 있어요.', '그 사람이 빈털터리가 되고 정까지 잃길...', '따끔한 교훈을 주고 싶어요.'] },
    { needs: ['health-', 'achieve-'], lines: ['저를 무시하던 선배가 요즘 한창 잘 나가요.', '슬럼프에 병까지 걸려봐야 정신 차리겠죠.', '몸도 마음도 꺾였으면 좋겠어요.'] },
    { needs: ['love+', 'achieve+'], lines: ['오랜 짝사랑 상대에게 고백하려 해요.', '용기도 필요하고, 자신감도 필요한데...', '당당하게 마음을 전하고 싶어요.'] },
    { needs: ['health-', 'wealth-'], lines: ['제 가게를 망쳐놓은 건물주가 있어요.', '돈줄도 몸도 시들어버렸으면...', '같은 고통을 느끼게 해주세요.'] },
  ];

  /* ---------- 수정구에 표시되는 "실제 욕구 수치" 단어 ---------- */
  // 용어는 재료/도감과 동일하게 재물·건강·성취·애정으로 통일하고, 방향만 (+)/(-)로 구분한다
  A.NEED_WORD = {};
  ['wealth', 'health', 'achieve', 'love'].forEach((axis) => {
    A.NEED_WORD[axis + '+'] = A.AXIS_LABEL[axis] + ' (+)';
    A.NEED_WORD[axis + '-'] = A.AXIS_LABEL[axis] + ' (-)';
  });
  A.needKey = (n) => n.axis + (n.dir > 0 ? '+' : '-');
  A.parseNeed = (key) => ({ axis: key.slice(0, -1), dir: key.endsWith('+') ? 1 : -1 });

  /* ---------- 판정별 반응 대사 ---------- */
  A.REACTIONS = {
    great: ['완벽해요! 내가 찾던 게 바로 이거였어요.', '세상에, 이거예요! 정말 감사합니다!'],
    normal: ['퀄리티는 나쁘지 않네요.', '음, 이렇게 쓰는 게 맞나요? 괜찮네요.'],
    bad: ['제가 원하던 건 아닌 것 같은데요...', '형편없군요. 이거 정말 효과 있긴 한가요?'],
    reject: ['그렇군요... 어쩔 수 없죠.', '아... 알겠습니다. 다른 곳을 알아볼게요.'],
  };
  A.GRADE_LABEL_EN = { great: 'Great', normal: 'Normal', bad: 'Bad', reject: '거절' };
  A.GRADE_RATING = { great: 5, normal: 4, bad: 2, reject: 0 }; // 평점 (자연수 0~5)
  A.GRADE_MULT = { great: 1.5, normal: 1.0, bad: 0.3, reject: 0 }; // 만족도 배율
  A.SHOP_LV_MULT = { 1: 1.0, 2: 1.2, 3: 1.4 };
  A.NEG_PRICE_MULT = 1.5;

  /* ---------- 하루치 손님 생성 ---------- */
  A.maxGradeForDay = function (day) {
    let g = 1;
    [1, 2, 3, 4].forEach((k) => {
      if (A.GRADE_UNLOCK_DAY[k] <= day) g = k;
    });
    return g;
  };

  A.CHAR_COUNT = 9; // character_1.png ~ character_9.png
  A.CHARS_PER_SHOP_LV = 3; // 집 단계마다 3명씩 추가

  A.generateDay = function (day, shopLv, seed, charPool) {
    const rng = A.makeRng(seed * 131 + day * 977);
    const cfg = A.dayConfig(day);
    const maxGrade = A.maxGradeForDay(day);
    // 현재 집 단계에서 등장 가능한 캐릭터 (집 업그레이드 때 랜덤 3명씩 추가됨)
    const typePool = charPool && charPool.length
      ? charPool
      : Array.from({ length: A.CHARS_PER_SHOP_LV * shopLv }, (_, i) => i + 1);

    const singleKeys = Object.keys(SINGLE).filter((k) => cfg.neg || k.endsWith('+'));
    const feasibleSingle = singleKeys.filter((k) => A.canGreat([A.parseNeed(k)], maxGrade));
    const multiPool = cfg.multi > 0
      ? MULTI.filter((m) => m.needs.every((k) => cfg.neg || k.endsWith('+'))).filter((m) => A.canGreat(m.needs.map(A.parseNeed), maxGrade))
      : [];

    // 복수 축 의뢰가 들어갈 순번 결정
    const slots = rng.shuffle(Array.from({ length: cfg.count }, (_, i) => i));
    const multiIdx = new Set(slots.slice(0, Math.min(cfg.multi, multiPool.length)));
    const multiBag = rng.shuffle(multiPool);

    const list = [];
    const usedText = new Set();
    let negCount = 0;
    for (let i = 0; i < cfg.count; i++) {
      let needs, lines, isChild = false;
      if (multiIdx.has(i) && multiBag.length) {
        const m = multiBag.shift();
        needs = m.needs.map(A.parseNeed);
        lines = m.lines;
      } else {
        // 캐릭터 이미지가 나이/성별과 무관하게 랜덤이므로 아이 전용 의뢰는 사용하지 않는다
        isChild = false;
        let key;
        if (isChild) {
          const keys = Object.keys(CHILD).filter((k) => A.canGreat([A.parseNeed(k)], maxGrade));
          key = rng.pick(keys);
          lines = rng.pick(CHILD[key]);
        } else {
          let tries = 0;
          do {
            key = rng.pick(feasibleSingle);
            const pool = SINGLE[key];
            lines = pool[rng.int(pool.length)];
            tries++;
          } while (usedText.has(lines[0]) && tries < 12);
          if (negCount >= A.NEG_PER_DAY_LIMIT && key.endsWith('-')) {
            key = rng.pick(feasibleSingle.filter((k) => k.endsWith('+')));
            lines = rng.pick(SINGLE[key]);
          }
        }
        needs = [A.parseNeed(key)];
      }
      usedText.add(lines[0]);
      if (needs.some((n) => n.dir < 0)) negCount++;
      // 직전 손님과 같은 캐릭터 이미지는 연속으로 나오지 않게 한다
      const prevType = list.length ? list[list.length - 1].type : null;
      const candidates = typePool.filter((t) => t !== prevType);
      const type = rng.pick(candidates.length ? candidates : typePool);
      list.push({
        index: i,
        type: type,
        isChild: isChild,
        portrait: 'character_' + type + '.png',
        greeting: rng.pick(isChild ? GREET_CHILD : GREET_ADULT),
        lines: lines,
        needs: needs,
        negative: needs.some((n) => n.dir < 0),
        item: rng.pick(cfg.items),
      });
    }
    return list;
  };
})();
