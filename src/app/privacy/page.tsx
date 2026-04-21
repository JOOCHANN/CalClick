import Link from "next/link";

export const metadata = { title: "개인정보 처리방침 · CalClick" };

export default function PrivacyPage() {
  return (
    <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-6 flex flex-col gap-4">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">개인정보 처리방침</h1>
        <Link href="/settings" className="text-xs text-neutral-500 underline">
          뒤로
        </Link>
      </header>
      <p className="text-xs text-neutral-500">최종 업데이트: 2026-04-21</p>

      <section className="flex flex-col gap-3 text-sm leading-relaxed">
        <h2 className="font-semibold mt-2">1. 수집 항목</h2>
        <ul className="list-disc pl-5">
          <li>계정 정보: 이메일, 비밀번호(암호화 저장)</li>
          <li>식사 기록: 음식 사진, 인식된 음식명·중량·칼로리, 기록 시각</li>
          <li>동의 일시</li>
        </ul>

        <h2 className="font-semibold mt-2">2. 수집 및 이용 목적</h2>
        <p>음식 사진 분석, 칼로리 계산, 일일/누적 섭취량 기록 및 조회.</p>

        <h2 className="font-semibold mt-2">3. 보관 기간</h2>
        <p>계정 삭제 요청 시 즉시 영구 삭제.</p>

        <h2 className="font-semibold mt-2">4. 제3자 제공</h2>
        <p>
          음식 인식을 위해 사진이 OpenAI (GPT-4o Vision API)로 Cloudflare AI Gateway를 경유해 일시 전송됩니다.
          OpenAI는 API 데이터를 모델 학습에 사용하지 않습니다 (기본 정책 기준). 그 외 제3자 제공 없음.
        </p>

        <h2 className="font-semibold mt-2">5. 삭제권 행사</h2>
        <p>
          <Link href="/settings" className="text-green-600 underline">
            설정 → 계정 삭제
          </Link>
          에서 즉시 삭제 가능. 계정·식사 기록·사진 전부 DB에서 삭제됨.
        </p>

        <h2 className="font-semibold mt-2">6. 안전성 확보 조치</h2>
        <ul className="list-disc pl-5">
          <li>전송 구간 HTTPS</li>
          <li>Supabase RLS로 타 사용자 데이터 접근 차단</li>
          <li>비밀번호 해시 저장</li>
        </ul>

        <h2 className="font-semibold mt-2">7. 문의</h2>
        <p>green261535@gmail.com</p>
      </section>
    </main>
  );
}
