import React from 'react';
import { cn } from "@/lib/utils";

interface BodyVisualizerProps {
  gender: 'male' | 'female';
  measurements: Record<string, number | null | undefined>;
}

export const BodyVisualizer: React.FC<BodyVisualizerProps> = ({ gender, measurements }) => {
  const isFemale = gender === 'female';

  // Helper to render a measurement line and label
  const MeasureLine = ({ x, y, width, label, value, unit = "cm", side = "right" }: any) => (
    <g className="group cursor-pointer">
      <line 
        x1={x} y1={y} 
        x2={side === "right" ? x + width : x - width} y2={y} 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeDasharray="4 2"
        className="text-primary group-hover:text-primary transition-colors"
      />
      <circle cx={x} cy={y} r="4" className="fill-primary" />
      <foreignObject 
        x={side === "right" ? x + width + 5 : x - width - 105} 
        y={y - 15} 
        width="100" 
        height="40"
      >
        <div className={cn(
          "text-xs p-1 rounded bg-card/90 border shadow-sm backdrop-blur-sm",
          side === "right" ? "text-left" : "text-right"
        )}>
          <div className="font-semibold text-foreground">{label}</div>
          <div className="text-primary">{value ? `${value} ${unit}` : '-'}</div>
        </div>
      </foreignObject>
    </g>
  );

  return (
    <div className="relative w-full h-[500px] flex items-center justify-center bg-muted/10 rounded-xl border border-border/50">
       {/* Body Fat Percentage Display - Moved to outside corner (Parent Container) */}
       <div className="absolute top-4 left-4 bg-card/95 backdrop-blur-sm p-3 rounded-xl border border-border/50 shadow-xl z-20 flex flex-col items-start gap-1 animate-in fade-in slide-in-from-left-4 max-w-[180px]">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Gordura Corporal</div>
          {measurements.bodyFat ? (
             <>
              <div className="text-2xl font-bold text-primary flex items-baseline gap-1">
                {typeof measurements.bodyFat === 'number' ? measurements.bodyFat.toFixed(1) : measurements.bodyFat}
                <span className="text-sm font-normal text-muted-foreground">%</span>
              </div>
              <div className="flex items-start gap-1.5 mt-1">
                <div className="text-[10px] text-muted-foreground text-left leading-3 opacity-80">
                  ⚠️ Cálculo estimado. Pode haver margem de erro.
                </div>
              </div>
             </>
          ) : (
              <div className="text-xs text-muted-foreground italic leading-relaxed">
                 Adicione altura, pescoço e cintura para calcular.
              </div>
          )}
       </div>

       {/* Constrained Aspect Ratio Container (1:2) */}
       <div className="relative h-full aspect-[1/2] group">
         
         {/* Image Background Wrapper - Handles Clipping */}
         <div className="absolute inset-0 w-full h-full bg-white rounded-lg overflow-hidden">
            <img 
              src={isFemale ? "/body-female.png" : "/body-male.png"}
              alt="Body Model"
              className="w-full h-full object-contain p-2"
            />
         </div>

        {/* SVG Overlay - Allows Overflow for Labels */}
        <svg 
          viewBox="0 0 200 400" 
          className="absolute inset-0 w-full h-full overflow-visible z-10"
          preserveAspectRatio="none" 
        >
          {/* Note: preserveAspectRatio="none" ensures SVG stretches exactly to the 1:2 container, matching the image */}
          
          {/* Measurement Lines - Distributed to avoid overlap */}
          
          {/* Pescoço / Neck (Right) */}
          <MeasureLine x={100} y={90} width={50} label="Pescoço" value={measurements.neck} />

          {/* Ombros / Shoulders (Left) */}
          <MeasureLine x={70} y={100} width={30} label="Ombros" value={measurements.shoulders} side="left" />

          {/* Peito / Chest (Right) */}
          <MeasureLine x={100} y={115} width={55} label="Peito" value={measurements.chest} />

          {/* Braço / Arm (Right - standard) */}
          <MeasureLine x={isFemale ? 135 : 145} y={135} width={40} label="Braço" value={measurements.arm} />

          {/* Cintura / Waist (Left) */}
          <MeasureLine x={100} y={isFemale ? 155 : 155} width={60} label="Cintura" value={measurements.waist} side="left" />

          {/* Quadril / Hips (Right) */}
          <MeasureLine x={100} y={isFemale ? 180 : 180} width={60} label="Quadril" value={measurements.hips} />
          
          {/* Coxa / Thigh (Left) */}
          <MeasureLine x={isFemale ? 75 : 80} y={245} width={45} label="Coxa" value={measurements.thigh} side="left" />
           
          {/* Panturrilha / Calves (Right) */}
          <MeasureLine x={isFemale ? 120 : 115} y={300} width={45} label="Panturrilha" value={measurements.calves} />

        </svg>
      </div>
    </div>
  );
};
