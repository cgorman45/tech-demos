"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { IssResponse } from "@/lib/types";

type ControlPanelProps = {
  showIss: boolean;
  showAircraft: boolean;
  onToggleIss: (v: boolean) => void;
  onToggleAircraft: (v: boolean) => void;
  onFocusIss: () => void;
  iss: IssResponse | null;
  aircraftCount: number;
  aircraftRegion: string;
};

export function ControlPanel({
  showIss,
  showAircraft,
  onToggleIss,
  onToggleAircraft,
  onFocusIss,
  iss,
  aircraftCount,
  aircraftRegion,
}: ControlPanelProps) {
  return (
    <Card className="pointer-events-auto w-72 border-white/10 bg-black/60 text-slate-100 backdrop-blur-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-sky-400" />
          God&apos;s Eye View
        </CardTitle>
        <CardDescription className="text-slate-400">
          Live open-data layers on a mini globe
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="iss-toggle" className="text-slate-200">
            ISS + orbit track
          </Label>
          <Switch
            id="iss-toggle"
            checked={showIss}
            onCheckedChange={onToggleIss}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="aircraft-toggle" className="text-slate-200">
            Aircraft (ADS-B)
          </Label>
          <Switch
            id="aircraft-toggle"
            checked={showAircraft}
            onCheckedChange={onToggleAircraft}
          />
        </div>

        <Button
          size="sm"
          variant="secondary"
          onClick={onFocusIss}
          disabled={!showIss || !iss}
        >
          Focus on ISS
        </Button>

        <div className="flex flex-col gap-2 border-t border-white/10 pt-3 text-xs text-slate-300">
          {iss ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="border-sky-400/40 text-sky-200">
                ISS
              </Badge>
              <span>
                {iss.position.lat.toFixed(2)}°, {iss.position.lng.toFixed(2)}° ·{" "}
                {Math.round(iss.position.alt)} km ·{" "}
                {Math.round(iss.position.velocity).toLocaleString()} km/h
              </span>
            </div>
          ) : (
            <span className="text-slate-500">Locating ISS…</span>
          )}
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              variant="outline"
              className="border-amber-400/40 text-amber-200"
            >
              ADS-B
            </Badge>
            <span>
              {aircraftCount} aircraft over {aircraftRegion}
            </span>
          </div>
        </div>

        <p className="text-[10px] leading-relaxed text-slate-500">
          Data: wheretheiss.at · api.adsb.lol (keyless). Drag to orbit, scroll
          to zoom.
        </p>
      </CardContent>
    </Card>
  );
}
