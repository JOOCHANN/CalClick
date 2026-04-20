# Step 2 — PWA Shell (manifest + iOS 카메라 meta)

## 목표
iOS Safari에서 홈 화면 설치 시 PWA로 동작하고, `<input capture>`가 카메라를 호출할 수 있는 최소 PWA 껍데기.

## 작업
1. `public/manifest.webmanifest`:
   ```json
   {
     "name": "CalClick",
     "short_name": "CalClick",
     "description": "한상차림 1장으로 칼로리 계산",
     "start_url": "/",
     "display": "standalone",
     "background_color": "#fafafa",
     "theme_color": "#16a34a",
     "icons": [
       { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
       { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" },
       { "src": "/icon-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
     ]
   }
   ```
2. 아이콘 생성 (임시): 단색 그린 배경 + 흰색 "C" 문자를 PNG로 생성 (ImageMagick 또는 Node `sharp`). 정식 아이콘은 MVP 후 디자인 교체.
3. `src/app/layout.tsx` metadata에 PWA/iOS 메타 추가:
   ```tsx
   export const metadata = {
     title: "CalClick",
     description: "한상차림 1장으로 칼로리 계산",
     manifest: "/manifest.webmanifest",
     themeColor: "#16a34a",
     appleWebApp: { capable: true, statusBarStyle: "default", title: "CalClick" },
   };
   export const viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };
   ```
4. `public/apple-touch-icon.png` 180x180 (동일 디자인).
5. Service Worker는 Step 6/Phase 6에서. 지금은 manifest만.

## Acceptance Criteria
- Chrome DevTools → Application → Manifest에 파싱 오류 없음.
- Lighthouse PWA 감사에서 "Installable" 통과.
- `/manifest.webmanifest` 200 응답.
- 모든 아이콘 경로 200 응답.
- `npm run build` 성공.

## 금지
- 오프라인 캐싱/Service Worker (Phase 6).
- Push 알림 관련 코드.
