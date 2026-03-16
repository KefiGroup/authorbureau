import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Heart, Flower2, Shield, GraduationCap, BookOpen, Gift,
  Sparkles, Apple, Cake, Building2, Gem, CalendarHeart, Ban, Pencil,
} from "lucide-react";

export interface OccasionTemplate {
  id: string;
  label: string;
  icon: React.ElementType;
  peakWindow: string;
  themeFocus: string;
  giftBuyer: string;
  popular?: boolean;
}

export const OCCASION_TEMPLATES: OccasionTemplate[] = [
  { id: "none", label: "No Occasion", icon: Ban, peakWindow: "Year-round", themeFocus: "Physical edition only", giftBuyer: "Standard buyer" },
  { id: "valentines", label: "Valentine's Day", icon: Heart, peakWindow: "Jan 15 – Feb 14", themeFocus: "Love, relationships, self-love", giftBuyer: "Partners, friends", popular: true },
  { id: "mothers-day", label: "Mother's Day", icon: Flower2, peakWindow: "Apr 15 – May 12", themeFocus: "Gratitude, nurturing, family wisdom", giftBuyer: "Children for mothers", popular: true },
  { id: "fathers-day", label: "Father's Day", icon: Shield, peakWindow: "May 15 – Jun 15", themeFocus: "Legacy, leadership, mentorship", giftBuyer: "Children for fathers" },
  { id: "graduation", label: "Graduation", icon: GraduationCap, peakWindow: "Apr 1 – Jun 30", themeFocus: "New beginnings, life lessons", giftBuyer: "Parents for graduates" },
  { id: "back-to-school", label: "Back to School", icon: BookOpen, peakWindow: "Jul 15 – Sep 15", themeFocus: "Learning, growth mindset", giftBuyer: "Parents for students" },
  { id: "christmas", label: "Christmas / Holiday", icon: Gift, peakWindow: "Oct 15 – Dec 25", themeFocus: "Reflection, gratitude, giving", giftBuyer: "Anyone for anyone", popular: true },
  { id: "new-year", label: "New Year", icon: Sparkles, peakWindow: "Dec 15 – Jan 15", themeFocus: "Fresh start, goal-setting", giftBuyer: "Self-purchase + gifts" },
  { id: "teacher-appreciation", label: "Teacher Appreciation", icon: Apple, peakWindow: "Apr 1 – May 10", themeFocus: "Education, impact, mentorship", giftBuyer: "Students/parents for teachers" },
  { id: "birthday", label: "Birthday Edition", icon: Cake, peakWindow: "Year-round", themeFocus: "Celebration, personal growth", giftBuyer: "Friends, family" },
  { id: "corporate-gift", label: "Corporate Gift", icon: Building2, peakWindow: "Year-round", themeFocus: "Leadership, teamwork", giftBuyer: "Companies for employees" },
  { id: "wedding-anniversary", label: "Wedding / Anniversary", icon: Gem, peakWindow: "Year-round", themeFocus: "Partnership, commitment", giftBuyer: "Couples, friends" },
  { id: "custom", label: "Custom Occasion", icon: Pencil, peakWindow: "Author-defined", themeFocus: "Author writes their own theme", giftBuyer: "Author-defined" },
];

interface Props {
  selectedOccasion: string;
  customOccasionName?: string;
  onSelect: (occasionId: string) => void;
  onCustomNameChange?: (name: string) => void;
}

export default function OccasionTemplateGrid({
  selectedOccasion,
  customOccasionName,
  onSelect,
  onCustomNameChange,
}: Props) {
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs font-semibold">Theme Your Edition (Optional)</Label>
        <p className="text-xs text-muted-foreground mt-0.5">
          Add an occasion theme to create a gift-ready edition with bonus content and targeted marketing.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
        {OCCASION_TEMPLATES.map((occasion) => {
          const Icon = occasion.icon;
          const isSelected = selectedOccasion === occasion.id;
          const isNone = occasion.id === "none";

          return (
            <button
              key={occasion.id}
              onClick={() => onSelect(occasion.id)}
              className={`relative p-3 rounded-xl border-2 text-left transition-all group ${
                isSelected
                  ? "border-secondary bg-secondary/5 shadow-sm"
                  : "border-border hover:border-secondary/40"
              } ${isNone ? "opacity-80" : ""}`}
            >
              {occasion.popular && (
                <Badge className="absolute -top-2 -right-2 bg-amber-500/90 text-[9px] px-1.5 py-0 font-semibold">
                  Popular
                </Badge>
              )}

              <div className="flex items-start gap-2">
                <div className={`shrink-0 mt-0.5 rounded-lg p-1.5 transition-colors ${
                  isSelected
                    ? "bg-secondary/15 text-secondary"
                    : "bg-muted text-muted-foreground group-hover:text-secondary/70"
                }`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-tight truncate">{occasion.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{occasion.peakWindow}</p>
                </div>
              </div>

              {isSelected && !isNone && (
                <p className="text-[10px] text-muted-foreground mt-2 leading-snug border-t border-border/50 pt-1.5">
                  {occasion.themeFocus}
                </p>
              )}
            </button>
          );
        })}
      </div>

      {selectedOccasion === "custom" && (
        <div className="space-y-1.5 pl-1">
          <Label className="text-xs font-semibold">Custom Occasion Name</Label>
          <Input
            value={customOccasionName || ""}
            onChange={(e) => onCustomNameChange?.(e.target.value)}
            placeholder="e.g., 'Teacher of the Year', 'Retirement Gift'"
            className="max-w-sm"
          />
        </div>
      )}

      {selectedOccasion && selectedOccasion !== "none" && (
        <div className="rounded-lg border border-secondary/20 bg-secondary/5 p-3 text-xs text-muted-foreground">
          <span className="font-semibold text-secondary">🎁 Gift Buyer Persona:</span>{" "}
          {OCCASION_TEMPLATES.find((o) => o.id === selectedOccasion)?.giftBuyer || "—"}
          <span className="mx-2">•</span>
          <span className="italic">
            Abby will generate themed bonus content, gift-buyer sales copy, and a 30-day marketing calendar when you reach the content step.
          </span>
        </div>
      )}
    </div>
  );
}
