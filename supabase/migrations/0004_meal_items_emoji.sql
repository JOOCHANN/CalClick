-- CalClick: meal_items 에 emoji 컬럼 추가 (다꾸 스티커)
-- 적용: Supabase Dashboard → SQL Editor 에 전체 붙여넣고 Run.

alter table meal_items
  add column if not exists emoji text;
