import { motion } from "framer-motion";
import { ExternalLink, Globe, BookOpen, Camera, User } from "lucide-react";
import { Button } from "@/components/ui/button";

type ProfileState = "none" | "incomplete" | "live";

interface Props {
  profileState: ProfileState;
  authorName?: string;
  authorPhoto?: string;
  authorSlug?: string;
  bookCovers?: string[];
  onSetupMicrosite: () => void;
  onCompleteProfile: () => void;
  onViewMicrosite: () => void;
}

export default function FreeMicrositeHero({
  profileState, authorName, authorPhoto, authorSlug, bookCovers = [],
  onSetupMicrosite, onCompleteProfile, onViewMicrosite,
}: Props) {
  const pills = ["Your Books & Pricing", "Speaking & Coaching", "One Link for Everything"];

  return (
    <motion.section
      className="rounded-2xl overflow-hidden"
      style={{ background: "linear-gradient(135deg, #FFF8E7 0%, #FFF1CC 100%)" }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 md:p-10">
        {/* Left — 55% */}
        <div className="lg:col-span-7 flex flex-col justify-center gap-5">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-green-700 bg-green-100 rounded-full px-3 py-1 w-fit">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Free for Every Author
          </span>

          <h2 className="font-heading text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 leading-tight">
            Your Professional Author Page — <span className="text-amber-700">Live & Free</span>
          </h2>

          <p className="text-sm md:text-base text-gray-700 leading-relaxed max-w-lg">
            Get a polished landing page at <strong className="text-gray-900">authorsbureau.com/authors/{authorSlug || "your-name"}</strong> — 
            with your photo, bio, books, pricing, services, and social links. Share one link everywhere.
          </p>

          {profileState === "live" && authorSlug && (
            <div className="flex items-center gap-2 bg-white/80 rounded-lg border border-amber-200 px-3 py-2 w-fit">
              <Globe className="h-3.5 w-3.5 text-green-600" />
              <a
                href={`/authors/${authorSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-amber-800 hover:underline"
              >
                authorsbureau.com/authors/{authorSlug}
              </a>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {pills.map((pill) => (
              <span key={pill} className="inline-flex items-center gap-1.5 rounded-full bg-white/80 border border-amber-200 px-3 py-1.5 text-xs font-semibold text-gray-800 shadow-sm">
                {pill}
              </span>
            ))}
          </div>

          {profileState === "none" && (
            <Button onClick={onSetupMicrosite} size="lg" className="w-fit bg-amber-600 hover:bg-amber-700 text-white shadow-lg">
              <Globe className="h-4 w-4 mr-2" />
              Set Up Your Free Microsite →
            </Button>
          )}
          {profileState === "incomplete" && (
            <Button onClick={onCompleteProfile} size="lg" className="w-fit bg-amber-600 hover:bg-amber-700 text-white shadow-lg">
              <User className="h-4 w-4 mr-2" />
              Update Your Profile on PublishNow →
            </Button>
          )}
          {profileState === "live" && (
            <Button onClick={onViewMicrosite} size="lg" className="w-fit bg-green-600 hover:bg-green-700 text-white shadow-lg">
              <ExternalLink className="h-4 w-4 mr-2" />
              View Your Live Microsite ↗
            </Button>
          )}
        </div>

        {/* Right — 45% Browser mockup */}
        <div className="lg:col-span-5 flex items-center justify-center">
          <div className="w-full max-w-sm rounded-xl overflow-hidden shadow-2xl border border-gray-200 bg-[#0F172A]">
            {/* Browser bar */}
            <div className="bg-gray-100 border-b border-gray-200 px-3 py-2 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 rounded-md bg-white border border-gray-200 px-2 py-0.5 text-[10px] text-gray-500 truncate">
                authorsbureau.com/authors/{authorSlug || "your-name"}
              </div>
            </div>
            {/* Page content */}
            <div className="p-5 space-y-4 min-h-[220px]">
              <div className="flex items-center gap-3">
                {authorPhoto && profileState === "live" ? (
                  <img src={authorPhoto} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-amber-400" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center border-2 border-dashed border-gray-500">
                    <Camera className="h-5 w-5 text-gray-400" />
                  </div>
                )}
                <div>
                  <p className="text-white font-bold text-sm">{profileState === "live" && authorName ? authorName : "Your Name Here"}</p>
                  <p className="text-gray-400 text-[10px]">Published Author & Speaker</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-amber-400 font-bold mb-2">Published Books</p>
                <div className="flex gap-2">
                  {profileState === "live" && bookCovers.length > 0 ? (
                    bookCovers.slice(0, 3).map((cover, i) => (
                      <div key={i} className="w-10 h-14 rounded bg-gray-700 overflow-hidden shadow">
                        <img src={cover} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))
                  ) : (
                    [1, 2, 3].map((i) => (
                      <div key={i} className="w-10 h-14 rounded bg-gray-700 border border-dashed border-gray-600 flex items-center justify-center">
                        <BookOpen className="h-3 w-3 text-gray-500" />
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <span className="rounded-full bg-amber-500/20 text-amber-300 text-[9px] px-2 py-0.5">Speaking</span>
                <span className="rounded-full bg-blue-500/20 text-blue-300 text-[9px] px-2 py-0.5">Coaching</span>
                <span className="rounded-full bg-green-500/20 text-green-300 text-[9px] px-2 py-0.5">Courses</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
