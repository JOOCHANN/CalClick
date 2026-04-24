export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4">
      <div className="w-16 h-16 rounded-3xl bg-brand-100 flex items-center justify-center text-3xl">📡</div>
      <h1 className="text-xl font-bold text-ink-900">오프라인이에요</h1>
      <p className="text-sm text-ink-500 leading-relaxed">
        인터넷 연결이 끊겼어요.
        <br />
        다시 연결되면 CalClick이 자동으로 돌아와요.
      </p>
    </main>
  );
}
