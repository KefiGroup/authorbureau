import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Mail, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Freq = "daily" | "weekly" | "monthly" | "off";

const WEEKDAYS = [
  { v: 0, label: "Sunday" }, { v: 1, label: "Monday" }, { v: 2, label: "Tuesday" },
  { v: 3, label: "Wednesday" }, { v: 4, label: "Thursday" }, { v: 5, label: "Friday" },
  { v: 6, label: "Saturday" },
];

interface Props { authorId: string }

export default function AbbyReportSettingsCard({ authorId }: Props) {
  const [freq, setFreq] = useState<Freq>("weekly");
  const [weeklyDay, setWeeklyDay] = useState<number>(1);
  const [monthlyDay, setMonthlyDay] = useState<number>(1);
  const [timezone, setTimezone] = useState("UTC");
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (!authorId) return;
    (async () => {
      const { data } = await supabase
        .from("author_profiles")
        .select("report_frequency, report_weekly_day, report_monthly_day, timezone")
        .eq("id", authorId)
        .maybeSingle();
      if (data) {
        setFreq(((data as any).report_frequency || "weekly") as Freq);
        setWeeklyDay((data as any).report_weekly_day ?? 1);
        setMonthlyDay((data as any).report_monthly_day ?? 1);
        setTimezone((data as any).timezone || "UTC");
      }
      setLoading(false);
    })();
  }, [authorId]);

  const save = async (patch: Record<string, any>) => {
    const { error } = await supabase
      .from("author_profiles")
      .update(patch)
      .eq("id", authorId);
    if (error) toast.error("Couldn't save preference");
    else toast.success("Saved");
  };

  const onFreqChange = (v: string) => {
    const f = v as Freq;
    setFreq(f);
    save({ report_frequency: f });
  };

  const sendTest = async () => {
    setTesting(true);
    try {
      const { error } = await supabase.functions.invoke("abby-daily-report", {
        body: { author_id: authorId, frequency: freq === "off" ? "weekly" : freq },
      });
      if (error) throw error;
      toast.success("Test report sent — check your inbox");
    } catch (e: any) {
      toast.error(`Couldn't send: ${e?.message || "unknown error"}`);
    } finally {
      setTesting(false);
    }
  };

  if (loading) return null;

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold mb-0.5">ABBY Business Report</p>
            <p className="text-xs text-muted-foreground">
              Choose how often ABBY emails your business report. Sent at 8:00 AM in your timezone ({timezone}).
            </p>
          </div>
        </div>

        <RadioGroup value={freq} onValueChange={onFreqChange} className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(["daily", "weekly", "monthly", "off"] as Freq[]).map((f) => (
            <Label
              key={f}
              htmlFor={`freq-${f}`}
              className={`flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer text-sm ${
                freq === f ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <RadioGroupItem value={f} id={`freq-${f}`} />
              <span className="capitalize">{f}</span>
            </Label>
          ))}
        </RadioGroup>

        {freq === "weekly" && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Send on</Label>
            <Select
              value={String(weeklyDay)}
              onValueChange={(v) => { const n = parseInt(v, 10); setWeeklyDay(n); save({ report_weekly_day: n }); }}
            >
              <SelectTrigger className="w-full sm:w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                {WEEKDAYS.map((d) => <SelectItem key={d.v} value={String(d.v)}>{d.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        {freq === "monthly" && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Send on day</Label>
            <Select
              value={String(monthlyDay)}
              onValueChange={(v) => { const n = parseInt(v, 10); setMonthlyDay(n); save({ report_monthly_day: n }); }}
            >
              <SelectTrigger className="w-full sm:w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                  <SelectItem key={d} value={String(d)}>{d}{d === 1 ? "st" : d === 2 ? "nd" : d === 3 ? "rd" : "th"} of the month</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="pt-1">
          <Button size="sm" variant="outline" onClick={sendTest} disabled={testing}>
            {testing ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-2" />}
            Send me a test report now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
