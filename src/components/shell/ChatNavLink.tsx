import { useAccount } from '@/hooks/useAccount';

const CHAT_HREF = 'https://chat.thefixer.in';

export function ChatNavLink() {
  const { hasActiveSubscription } = useAccount();
  if (!hasActiveSubscription) return null;
  return (
    <a
      href={CHAT_HREF}
      className="app-nav-tab"
      data-active="false"
      data-active-tab="false"
      data-chat-nav-link="true"
    >
      The Fixer ai
    </a>
  );
}
