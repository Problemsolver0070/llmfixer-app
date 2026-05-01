import { useAccount } from "@/hooks/useAccount";

export function ChatCrossLink() {
  const { hasActiveSubscription } = useAccount();
  if (!hasActiveSubscription) return null;
  return (
    <div className="cross-link-footer" style={{ marginTop: "1.5rem", fontSize: "0.85rem", opacity: 0.7 }}>
      For general chat, open <a href="https://chat.thefixer.in">The Fixer Chat →</a>
    </div>
  );
}
