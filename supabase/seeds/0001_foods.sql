-- Phase 2 Step 3: 초기 foods + food_aliases seed
-- Phase 1 kcal-temp.ts MAP 이관. 식약처/농진청 공식 DB는 후속 phase에서 확장.
-- source='manual' — Phase 3에서 공식 출처로 교체 예정.

insert into public.foods (food_id, official_name, kcal_per_100g, source) values
  ('kimchi_jjigae',     '김치찌개',   62,  'manual'),
  ('doenjang_jjigae',   '된장찌개',   55,  'manual'),
  ('bibimbap',          '비빔밥',     160, 'manual'),
  ('bulgogi',           '불고기',     190, 'manual'),
  ('gimbap',            '김밥',       120, 'manual'),
  ('ramyeon',           '라면',       110, 'manual'),
  ('tteokbokki',        '떡볶이',     160, 'manual'),
  ('jeyuk_bokkeum',     '제육볶음',   180, 'manual'),
  ('samgyeopsal',       '삼겹살',     280, 'manual'),
  ('rice',              '쌀밥',       168, 'manual'),
  ('miyeokguk',         '미역국',     40,  'manual'),
  ('gyeran_jjim',       '계란찜',     110, 'manual')
on conflict (food_id) do update
  set official_name = excluded.official_name,
      kcal_per_100g = excluded.kcal_per_100g,
      source        = excluded.source;

insert into public.food_aliases (alias, food_id) values
  ('김치찌개',   'kimchi_jjigae'),
  ('김치 찌개', 'kimchi_jjigae'),
  ('된장찌개',   'doenjang_jjigae'),
  ('된장 찌개', 'doenjang_jjigae'),
  ('비빔밥',     'bibimbap'),
  ('돌솥비빔밥', 'bibimbap'),
  ('불고기',     'bulgogi'),
  ('소불고기',   'bulgogi'),
  ('김밥',       'gimbap'),
  ('참치김밥',   'gimbap'),
  ('라면',       'ramyeon'),
  ('신라면',     'ramyeon'),
  ('떡볶이',     'tteokbokki'),
  ('제육볶음',   'jeyuk_bokkeum'),
  ('돼지고기볶음', 'jeyuk_bokkeum'),
  ('삼겹살',     'samgyeopsal'),
  ('구운 삼겹살', 'samgyeopsal'),
  ('쌀밥',       'rice'),
  ('공깃밥',     'rice'),
  ('밥',         'rice'),
  ('흰쌀밥',     'rice'),
  ('미역국',     'miyeokguk'),
  ('계란찜',     'gyeran_jjim'),
  ('달걀찜',     'gyeran_jjim')
on conflict (alias) do update
  set food_id = excluded.food_id;
