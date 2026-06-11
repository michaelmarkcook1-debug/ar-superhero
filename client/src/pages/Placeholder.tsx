import { Eyebrow, Card } from "@/components/atoms";

export default function Placeholder({ title, description, eyebrow }: { title: string; description: string; eyebrow: string }) {
  return (
    <div className="px-5 lg:px-8 py-10 lg:py-14 max-w-[920px] mx-auto">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1 className="mt-1.5 text-[26px] font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-[13.5px] text-muted-foreground max-w-2xl leading-relaxed">{description}</p>
      <Card className="mt-8 p-8 text-center">
        <div className="text-[12px] uppercase tracking-[0.16em] text-muted-foreground">Prototype scope</div>
        <p className="mt-2 text-[13.5px] text-foreground/90 max-w-md mx-auto">
          This area exists in the wider AnalystGenius platform. The AR Superhero MVP focuses on the
          Command Centre, Workstreams, Analyst Landscape, Evidence Library, Leader Lens, Learning Queue,
          and Integrations.
        </p>
      </Card>
    </div>
  );
}
