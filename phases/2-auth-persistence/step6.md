# Step 6 — Privacy (동의 + 삭제권)

## 목표
한국 개인정보보호법 최소 요구: 수집 동의 명시, 계정+데이터 삭제 기능.

## 작업
1. 가입 플로우에 동의 체크박스 (사진·식사 기록 수집 및 처리). 체크 없으면 가입 불가.
2. 가입 시 `profiles.privacy_accepted_at` 기록.
3. `src/app/settings/page.tsx` — 계정 삭제 버튼.
4. `src/app/api/account/route.ts` DELETE — 사용자 + meals + meal_items 전부 삭제 (CASCADE로 자동, auth.users는 service role key 필요).
5. 삭제 후 세션 종료 + `/login` 리다이렉트.
6. `docs/PRIVACY.md` — 수집 항목, 보관 기간, 제3자 공유 여부, 삭제 방법.

## Acceptance Criteria
- 동의 없으면 가입 불가.
- 삭제 버튼 → 확인 모달 → 실행 → DB에 해당 유저 row 0.
- `docs/PRIVACY.md` 존재.

## 금지
- 소프트 삭제 (명시적 삭제 요구 — 한국 법 준수).
- 이메일 마케팅 동의 분리 (MVP 미지원).
