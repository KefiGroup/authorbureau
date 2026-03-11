import WebsiteBlueprintPage from "./microsite/WebsiteBlueprintPage";

interface Props {
  onNavigate?: (section: string) => void;
}

export default function MicrositeManager({ onNavigate }: Props) {
  return <WebsiteBlueprintPage onNavigate={onNavigate} />;
}
