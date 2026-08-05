import React, { useState, useMemo } from "react";
import { Post } from "../types";
import { 
  BarChart3, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Share2, 
  Globe, 
  Zap, 
  Calendar,
  Activity,
  Award
} from "lucide-react";

interface AnalyticsPanelProps {
  posts: Post[];
  connectedAccounts: any[];
}

export default function AnalyticsPanel({ posts, connectedAccounts }: AnalyticsPanelProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<"7d" | "30d" | "all">("7d");
  const [hoveredPoint, setHoveredPoint] = useState<{ day: string; count: number; x: number; y: number } | null>(null);

  // 1. Calculate General Metrics
  const metrics = useMemo(() => {
    const total = posts.length;
    const published = posts.filter(p => p.status === "published").length;
    const failed = posts.filter(p => p.status === "failed").length;
    const scheduled = posts.filter(p => p.status === "scheduled" || p.status === "pending").length;
    
    // Success rate is calculated based on completed attempts (published vs failed)
    const completedAttempts = published + failed;
    const successRate = completedAttempts > 0 
      ? Math.round((published / completedAttempts) * 100) 
      : 100;

    return {
      total,
      published,
      failed,
      scheduled,
      successRate
    };
  }, [posts]);

  // 2. Platform Distribution
  const platformData = useMemo(() => {
    const counts: { [key: string]: number } = {};
    posts.forEach(post => {
      post.platforms.forEach(plat => {
        counts[plat] = (counts[plat] || 0) + 1;
      });
    });

    const sortedPlatforms = Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const maxCount = Math.max(...sortedPlatforms.map(p => p.count), 1);

    return sortedPlatforms.map(item => ({
      ...item,
      percentage: Math.round((item.count / maxCount) * 100)
    }));
  }, [posts]);

  // 3. Timeframe-Based Timeline Chart Data
  const timelineData = useMemo(() => {
    const daysToGenerate = selectedTimeframe === "7d" ? 7 : selectedTimeframe === "30d" ? 30 : 15;
    const dataPoints: { day: string; count: number; formattedDate: string }[] = [];
    
    const now = new Date();
    
    for (let i = daysToGenerate - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      
      const dateString = d.toISOString().split("T")[0];
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const fullLabel = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      
      // Count posts published or scheduled on this calendar day
      const dailyCount = posts.filter(post => {
        const postDate = post.publishedAt || post.createdAt;
        return postDate.startsWith(dateString);
      }).length;

      dataPoints.push({
        day: label,
        count: dailyCount,
        formattedDate: fullLabel
      });
    }

    return dataPoints;
  }, [posts, selectedTimeframe]);

  // 4. Generate SVG Line Chart Path and Points
  const chartParams = useMemo(() => {
    const width = 500;
    const height = 180;
    const paddingLeft = 35;
    const paddingRight = 15;
    const paddingTop = 25;
    const paddingBottom = 30;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    const counts = timelineData.map(d => d.count);
    const maxVal = Math.max(...counts, 4); // default minimum ceiling of 4 for nice scaling

    const points = timelineData.map((d, index) => {
      const x = paddingLeft + (index / (timelineData.length - 1 || 1)) * chartWidth;
      const y = paddingTop + chartHeight - (d.count / maxVal) * chartHeight;
      return { x, y, day: d.day, count: d.count, formattedDate: d.formattedDate };
    });

    // Create curved spline paths using catmull-rom or simple bezier control points
    let linePath = "";
    let areaPath = "";

    if (points.length > 0) {
      linePath = `M ${points[0].x} ${points[0].y}`;
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i];
        const p1 = points[i + 1];
        // cubic bezier controls
        const cpX1 = p0.x + (p1.x - p0.x) / 3;
        const cpY1 = p0.y;
        const cpX2 = p0.x + 2 * (p1.x - p0.x) / 3;
        const cpY2 = p1.y;
        linePath += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
      }

      areaPath = `${linePath} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`;
    }

    return {
      width,
      height,
      paddingLeft,
      paddingRight,
      paddingTop,
      paddingBottom,
      chartWidth,
      chartHeight,
      maxVal,
      points,
      linePath,
      areaPath
    };
  }, [timelineData]);

  return (
    <div className="flex flex-col flex-1 min-w-0" id="omnipost-analytics-hub">
      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 mb-5 shrink-0">
        <div className="bg-zinc-950/40 border border-zinc-850 p-3 rounded-xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[8px] font-mono font-bold text-zinc-500 uppercase tracking-widest block">Success Rate</span>
            <span className="text-sm font-bold text-zinc-100 font-mono">{metrics.successRate}%</span>
          </div>
        </div>

        <div className="bg-zinc-950/40 border border-zinc-850 p-3 rounded-xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[8px] font-mono font-bold text-zinc-500 uppercase tracking-widest block">Dispatches</span>
            <span className="text-sm font-bold text-zinc-100 font-mono">{metrics.total}</span>
          </div>
        </div>

        <div className="bg-zinc-950/40 border border-zinc-850 p-3 rounded-xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[8px] font-mono font-bold text-zinc-500 uppercase tracking-widest block">Scheduled Queue</span>
            <span className="text-sm font-bold text-zinc-100 font-mono">{metrics.scheduled}</span>
          </div>
        </div>

        <div className="bg-zinc-950/40 border border-zinc-850 p-3 rounded-xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
            <Globe className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[8px] font-mono font-bold text-zinc-500 uppercase tracking-widest block">Linked Channels</span>
            <span className="text-sm font-bold text-zinc-100 font-mono">{connectedAccounts.length}</span>
          </div>
        </div>
      </div>

      {/* Historical Trend Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1">
          <Activity className="w-3 h-3 text-emerald-400" /> Dispatch Ingestion Over Time
        </span>
        <div className="flex gap-1 p-0.5 bg-zinc-950 border border-zinc-850 rounded-lg">
          {(["7d", "30d"] as const).map(time => (
            <button
              key={time}
              onClick={() => setSelectedTimeframe(time)}
              className={`px-1.5 py-0.5 rounded text-[7px] font-mono font-bold uppercase transition-all cursor-pointer ${
                selectedTimeframe === time 
                  ? "bg-zinc-800 text-white" 
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {time}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Trend Chart */}
      <div className="bg-zinc-950/60 border border-zinc-850 rounded-xl p-3 relative mb-5 shrink-0 select-none">
        <svg 
          viewBox={`0 0 ${chartParams.width} ${chartParams.height}`} 
          className="w-full h-auto overflow-visible"
        >
          {/* Definitions for Gradient fills */}
          <defs>
            <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.00" />
            </linearGradient>
          </defs>

          {/* Grid lines (Y-axis subdivisions) */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = chartParams.paddingTop + ratio * chartParams.chartHeight;
            const labelVal = Math.round(chartParams.maxVal * (1 - ratio));
            return (
              <g key={i} className="opacity-40">
                <line 
                  x1={chartParams.paddingLeft} 
                  y1={y} 
                  x2={chartParams.width - chartParams.paddingRight} 
                  y2={y} 
                  stroke="#27272a" 
                  strokeWidth="1" 
                  strokeDasharray="4 4" 
                />
                <text 
                  x={chartParams.paddingLeft - 8} 
                  y={y + 3} 
                  fill="#71717a" 
                  fontSize="8" 
                  fontFamily="monospace" 
                  textAnchor="end"
                >
                  {labelVal}
                </text>
              </g>
            );
          })}

          {/* Fill Area Under Spline */}
          {chartParams.areaPath && (
            <path d={chartParams.areaPath} fill="url(#chartGlow)" />
          )}

          {/* Spline Path */}
          {chartParams.linePath && (
            <path 
              d={chartParams.linePath} 
              fill="none" 
              stroke="#10b981" 
              strokeWidth="1.75" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />
          )}

          {/* Interactive Plot Points */}
          {chartParams.points.map((pt, i) => {
            const isHovered = hoveredPoint?.day === pt.day;
            return (
              <g key={i}>
                {/* Large transparent touch/hover targets */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="12"
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredPoint(pt)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
                
                {/* Outer pulsing ring for hover */}
                {isHovered && (
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="6.5"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="1.5"
                    opacity="0.5"
                  />
                )}
                
                {/* Core Plot Point dot */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? "4" : "2.5"}
                  fill={isHovered ? "#10b981" : "#09090b"}
                  stroke="#10b981"
                  strokeWidth="1.5"
                  className="transition-all duration-150"
                />
              </g>
            );
          })}

          {/* X-Axis labels */}
          {chartParams.points.map((pt, i) => {
            // Decimate labels for 30d view so they don't overlap
            const shouldShowLabel = 
              selectedTimeframe === "7d" || 
              i % 5 === 0 || 
              i === chartParams.points.length - 1;
            
            if (!shouldShowLabel) return null;

            return (
              <text
                key={i}
                x={pt.x}
                y={chartParams.height - 10}
                fill="#71717a"
                fontSize="8"
                fontFamily="monospace"
                textAnchor="middle"
                className="opacity-80"
              >
                {pt.day}
              </text>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredPoint && (
          <div 
            className="absolute bg-zinc-900/95 border border-zinc-800 rounded-lg p-2.5 shadow-xl pointer-events-none text-left z-30 flex flex-col gap-0.5 animate-fade-in"
            style={{
              left: `${Math.min(
                Math.max(10, (hoveredPoint.x / chartParams.width) * 100 - 15), 
                70
              )}%`,
              top: `${Math.max(5, (hoveredPoint.y / chartParams.height) * 100 - 35)}%`
            }}
          >
            <span className="text-[7px] font-bold text-zinc-500 uppercase tracking-widest font-mono">
              {hoveredPoint.formattedDate}
            </span>
            <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-zinc-200 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>{hoveredPoint.count} Payload{hoveredPoint.count !== 1 ? "s" : ""}</span>
            </div>
          </div>
        )}
      </div>

      {/* Target Distribution list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin pr-1 flex flex-col">
        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 mb-3">
          <Award className="w-3.5 h-3.5 text-emerald-400" /> Platform Share Breakdown
        </span>

        {platformData.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-zinc-500 border border-dashed border-zinc-800/80 rounded-xl p-5 bg-zinc-950/20 font-mono text-[9px] uppercase tracking-widest">
            Awaiting analytics ingestion
          </div>
        ) : (
          <div className="space-y-3">
            {platformData.map((plat) => (
              <div key={plat.name} className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-zinc-300 font-bold uppercase tracking-wider">{plat.name}</span>
                  <div className="flex items-center gap-1.5 text-zinc-500">
                    <span className="text-zinc-400 font-bold">{plat.count}</span>
                    <span className="text-[8px]">dispatches</span>
                  </div>
                </div>
                {/* custom slider progress track */}
                <div className="w-full h-1.5 bg-zinc-950 border border-zinc-900 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500/80 to-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${plat.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
