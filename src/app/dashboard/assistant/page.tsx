import { AssistantChat } from "@/components/assistant/assistant-chat";

export const metadata = { title: "AI Assistant" };

export default function DashboardAssistantPage() {
  // Fills the dashboard's main area: viewport minus the mobile header and
  // bottom bar (and the main padding) so only the messages scroll.
  return (
    <div className="-m-4 -mb-20 flex h-[calc(100dvh-7rem)] flex-col md:-m-8 md:h-dvh">
      <AssistantChat variant="dashboard" />
    </div>
  );
}
