export default function CentralLogo({ size, className = "" }: { size?: number; className?: string }) {
  const dim = size ? 40 * size : "100%";
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <svg width={dim} height={dim} viewBox="0 0 120 120" aria-hidden="true">
        <line x1="60" y1="60" x2="60" y2="20" stroke="var(--primary-colour)" strokeWidth="3" />
        <line x1="60" y1="60" x2="100" y2="60" stroke="var(--primary-colour)" strokeWidth="3" />
        <line x1="60" y1="60" x2="60" y2="100" stroke="var(--primary-colour)" strokeWidth="3" />
        <line x1="60" y1="60" x2="20" y2="60" stroke="var(--primary-colour)" strokeWidth="3" />

        <circle cx="60" cy="60" r="14" fill="var(--primary-colour)" />
        <circle cx="60" cy="15" r="14" fill="var(--primary-colour)" />
        <circle cx="105" cy="60" r="14" fill="var(--primary-colour)" />
        <circle cx="60" cy="105" r="14" fill="var(--primary-colour)" />
        <circle cx="15" cy="60" r="14" fill="var(--primary-colour)" />
      </svg>
    </div>
  );
}