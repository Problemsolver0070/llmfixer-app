import { SetupReference } from '@/components/setup/SetupReference';
import { SupportChat } from '@/components/support/SupportChat';

export function Setup() {
  return (
    <div className="setup-split">
      <div className="setup-split-pane setup-split-pane-left">
        <SetupReference />
      </div>
      <div className="setup-split-pane setup-split-pane-right">
        <SupportChat />
      </div>
    </div>
  );
}

export default Setup;
