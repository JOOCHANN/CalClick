-- CalClick Phase 4: LLM 추정 음식도 meal_items에 저장할 수 있도록 확장
-- 적용: Supabase Dashboard → SQL Editor에 전체 붙여넣고 Run.

alter table meal_items
  alter column food_id drop not null;

alter table meal_items
  add column if not exists name text,
  add column if not exists source text not null default 'db' check (source in ('db', 'llm'));

-- food_id가 null이면 name이 반드시 있어야 함
alter table meal_items
  drop constraint if exists meal_items_food_or_name;
alter table meal_items
  add constraint meal_items_food_or_name
  check (food_id is not null or (name is not null and length(name) > 0));
