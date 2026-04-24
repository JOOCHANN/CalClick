type Props = {
  url?: string | null;
  emoji?: string | null;
  size?: number;
  className?: string;
};

export function AvatarView({ url, emoji, size = 40, className = "" }: Props) {
  const dim = `${size}px`;
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        width={size}
        height={size}
        style={{ width: dim, height: dim }}
        className={`rounded-3xl object-cover bg-cream-100 ${className}`}
      />
    );
  }
  return (
    <span
      style={{ width: dim, height: dim, fontSize: Math.round(size * 0.5) }}
      className={`rounded-3xl bg-gradient-to-br from-cream-100 to-brand-100 flex items-center justify-center ${className}`}
    >
      {emoji ?? "🍚"}
    </span>
  );
}
