import { useSession } from "./state/session.ts";
import { useUI } from "./state/ui.ts";
import { Toasts } from "./ui/primitives.tsx";
import { Kit } from "./screens/Kit.tsx";
import { Landing } from "./screens/Landing.tsx";
import { Onboarding } from "./screens/onboarding/Onboarding.tsx";
import { WorldScreen } from "./screens/world/WorldScreen.tsx";

export function App() {
  const status = useSession((s) => s.status);
  const kitMode = useUI((s) => s.kitMode);
  if (kitMode) return <Kit />;
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
      {status === "booting" ? null : null}
      {status === "landing" ? <Landing /> : null}
      {status === "onboarding" ? <Onboarding /> : null}
      {status === "world" ? <WorldScreen /> : null}
      <Toasts />
    </div>
  );
}
