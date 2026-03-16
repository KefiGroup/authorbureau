import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Clock, Coffee, Plus, Trash2, Sparkles } from "lucide-react";
import type { CourseStepProps, WorkshopDay, WorkshopTimeBlock } from "./types";

function generateId() {
  return crypto.randomUUID();
}

const BLOCK_COLORS: Record<string, string> = {
  module: "border-l-secondary bg-secondary/5",
  break: "border-l-amber-400 bg-amber-50 dark:bg-amber-900/10",
  opening: "border-l-blue-400 bg-blue-50 dark:bg-blue-900/10",
  closing: "border-l-violet-400 bg-violet-50 dark:bg-violet-900/10",
  checkin: "border-l-teal-400 bg-teal-50 dark:bg-teal-900/10",
};

function defaultSchedule(format: string): WorkshopDay[] {
  if (format === "3_day") {
    return [
      {
        dayNumber: 1, label: "Day 1 — Foundations",
        blocks: [
          { id: generateId(), startTime: "09:00", endTime: "09:15", label: "Opening & Welcome", type: "opening" },
          { id: generateId(), startTime: "09:15", endTime: "10:30", label: "Module 1 — Orientation", type: "module", moduleNumber: 1 },
          { id: generateId(), startTime: "10:30", endTime: "10:45", label: "Break", type: "break" },
          { id: generateId(), startTime: "10:45", endTime: "12:00", label: "Module 2 — Foundations", type: "module", moduleNumber: 2 },
          { id: generateId(), startTime: "12:00", endTime: "12:15", label: "Day 1 Closing Reflection", type: "closing" },
        ],
      },
      {
        dayNumber: 2, label: "Day 2 — Application",
        blocks: [
          { id: generateId(), startTime: "09:00", endTime: "09:15", label: "Day 2 Check-in", type: "checkin" },
          { id: generateId(), startTime: "09:15", endTime: "10:15", label: "Module 3 — Framework", type: "module", moduleNumber: 3 },
          { id: generateId(), startTime: "10:15", endTime: "10:30", label: "Break", type: "break" },
          { id: generateId(), startTime: "10:30", endTime: "11:45", label: "Module 4 — Application", type: "module", moduleNumber: 4 },
          { id: generateId(), startTime: "11:45", endTime: "12:00", label: "Module 5 — Case Studies", type: "module", moduleNumber: 5 },
          { id: generateId(), startTime: "12:00", endTime: "12:15", label: "Day 2 Closing Reflection", type: "closing" },
        ],
      },
      {
        dayNumber: 3, label: "Day 3 — Implementation",
        blocks: [
          { id: generateId(), startTime: "09:00", endTime: "09:15", label: "Day 3 Check-in", type: "checkin" },
          { id: generateId(), startTime: "09:15", endTime: "10:30", label: "Module 6 — Creation Sprint", type: "module", moduleNumber: 6 },
          { id: generateId(), startTime: "10:30", endTime: "10:45", label: "Break", type: "break" },
          { id: generateId(), startTime: "10:45", endTime: "12:00", label: "Module 7 — Implementation & 90-Day Roadmap", type: "module", moduleNumber: 7 },
          { id: generateId(), startTime: "12:00", endTime: "12:30", label: "Closing Ceremony & Next Steps", type: "closing" },
        ],
      },
    ];
  }
  return [
    {
      dayNumber: 1, label: "Day 1 — Learn & Understand",
      blocks: [
        { id: generateId(), startTime: "09:00", endTime: "09:15", label: "Opening & Welcome", type: "opening" },
        { id: generateId(), startTime: "09:15", endTime: "10:30", label: "Module 1 — Orientation", type: "module", moduleNumber: 1 },
        { id: generateId(), startTime: "10:30", endTime: "10:45", label: "Break", type: "break" },
        { id: generateId(), startTime: "10:45", endTime: "12:00", label: "Module 2 — Foundations", type: "module", moduleNumber: 2 },
        { id: generateId(), startTime: "12:00", endTime: "13:00", label: "Lunch Break", type: "break" },
        { id: generateId(), startTime: "13:00", endTime: "14:15", label: "Module 3 — Framework", type: "module", moduleNumber: 3 },
        { id: generateId(), startTime: "14:15", endTime: "14:30", label: "Break", type: "break" },
        { id: generateId(), startTime: "14:30", endTime: "15:00", label: "Day 1 Closing Reflection", type: "closing" },
      ],
    },
    {
      dayNumber: 2, label: "Day 2 — Apply & Create",
      blocks: [
        { id: generateId(), startTime: "09:00", endTime: "09:15", label: "Day 2 Check-in", type: "checkin" },
        { id: generateId(), startTime: "09:15", endTime: "10:30", label: "Module 4 — Application", type: "module", moduleNumber: 4 },
        { id: generateId(), startTime: "10:30", endTime: "10:45", label: "Break", type: "break" },
        { id: generateId(), startTime: "10:45", endTime: "12:00", label: "Module 5 — Case Studies", type: "module", moduleNumber: 5 },
        { id: generateId(), startTime: "12:00", endTime: "13:00", label: "Lunch Break", type: "break" },
        { id: generateId(), startTime: "13:00", endTime: "14:15", label: "Module 6 — Creation Sprint", type: "module", moduleNumber: 6 },
        { id: generateId(), startTime: "14:15", endTime: "14:30", label: "Break", type: "break" },
        { id: generateId(), startTime: "14:30", endTime: "15:30", label: "Module 7 — Implementation & 90-Day Roadmap", type: "module", moduleNumber: 7 },
        { id: generateId(), startTime: "15:30", endTime: "16:00", label: "Closing Ceremony & Next Steps", type: "closing" },
      ],
    },
  ];
}

export default function WorkshopScheduleStep({ stepData, setStepData, onMarkEdited }: CourseStepProps) {
  const format = stepData.foundation?.format || "2_day";
  const schedule: WorkshopDay[] = Array.isArray(stepData.schedule?.days) ? stepData.schedule.days : [];

  const getBlocks = (day: WorkshopDay): WorkshopTimeBlock[] =>
    Array.isArray(day.blocks) ? day.blocks : [];

  const updateSchedule = (days: WorkshopDay[]) => {
    setStepData(prev => ({ ...prev, schedule: { days } }));
    onMarkEdited("schedule");
  };

  const generateDefault = () => {
    updateSchedule(defaultSchedule(format));
  };

  const updateBlock = (dayIdx: number, blockId: string, field: string, value: any) => {
    const next = schedule.map((day, di) =>
      di === dayIdx
        ? { ...day, blocks: getBlocks(day).map((b) => b.id === blockId ? { ...b, [field]: value } : b) }
        : day
    );
    updateSchedule(next);
  };

  const addBlock = (dayIdx: number) => {
    const next = schedule.map((day, di) =>
      di === dayIdx
        ? { ...day, blocks: [...getBlocks(day), { id: generateId(), startTime: "00:00", endTime: "00:00", label: "New Block", type: "module" as const }] }
        : day
    );
    updateSchedule(next);
  };

  const removeBlock = (dayIdx: number, blockId: string) => {
    const next = schedule.map((day, di) =>
      di === dayIdx
        ? { ...day, blocks: getBlocks(day).filter((b) => b.id !== blockId) }
        : day
    );
    updateSchedule(next);
  };

  if (schedule.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
        <h3 className="font-heading text-lg font-semibold mb-2">Workshop Schedule</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
          Generate a day-by-day, hour-by-hour schedule for your {format === "3_day" ? "3-day" : format === "2_5_day" ? "2.5-day" : "2-day"} workshop with breaks and energy management.
        </p>
        <Button onClick={generateDefault} className="rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90">
          <Sparkles className="h-4 w-4 mr-2" /> Generate Schedule
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {format === "3_day" ? "3-Day Workshop" : format === "2_5_day" ? "2.5-Day Hybrid" : "2-Day Intensive"} · Edit times and labels below
        </p>
        <Button variant="outline" size="sm" onClick={generateDefault} className="text-xs">
          Reset to Default
        </Button>
      </div>

      {schedule.map((day, dayIdx) => {
        const blocks = getBlocks(day);

        return (
          <Card key={day.dayNumber} className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">{day.label}</h3>
              <Badge variant="outline" className="text-[10px]">{blocks.length} blocks</Badge>
            </div>

            <div className="space-y-1">
              {blocks.map((block) => (
                <div
                  key={block.id}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg border-l-4 transition-colors group ${
                    BLOCK_COLORS[block.type] || "border-l-muted bg-muted/20"
                  }`}
                >
                  <div className="flex items-center gap-1 shrink-0">
                    <Input
                      value={block.startTime}
                      onChange={(e) => updateBlock(dayIdx, block.id, "startTime", e.target.value)}
                      className="w-16 h-7 text-[10px] text-center p-0"
                    />
                    <span className="text-[10px] text-muted-foreground">–</span>
                    <Input
                      value={block.endTime}
                      onChange={(e) => updateBlock(dayIdx, block.id, "endTime", e.target.value)}
                      className="w-16 h-7 text-[10px] text-center p-0"
                    />
                  </div>
                  {block.type === "break" && <Coffee className="h-3 w-3 text-amber-500 shrink-0" />}
                  <Input
                    value={block.label}
                    onChange={(e) => updateBlock(dayIdx, block.id, "label", e.target.value)}
                    className="flex-1 h-7 text-xs border-none bg-transparent shadow-none p-0 focus-visible:ring-0"
                  />
                  <button
                    onClick={() => removeBlock(dayIdx, block.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-3 w-3 text-destructive/50" />
                  </button>
                </div>
              ))}
            </div>

            <Button variant="ghost" size="sm" onClick={() => addBlock(dayIdx)} className="text-[10px]">
              <Plus className="h-2.5 w-2.5 mr-1" /> Add Time Block
            </Button>
          </Card>
        );
      })}
    </div>
  );
}
