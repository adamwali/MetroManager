interface StubDashboardProps {
  title: string;
  phase: string;
}

export function StubDashboard({ title, phase }: StubDashboardProps) {
  return (
    <section>
      <h1 className="text-2xl font-light tracking-wide">{title}</h1>
      <p className="mt-2 text-sm text-neutral-400">Not yet implemented.</p>
      <p className="mt-1 text-xs text-neutral-500">Scheduled for {phase} per the build playbook.</p>
    </section>
  );
}
