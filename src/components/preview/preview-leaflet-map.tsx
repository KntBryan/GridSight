"use client";

import { useEffect, useState, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Circle,
  Popup,
  useMap,
} from "react-leaflet";
import type { GeoJsonObject } from "geojson";
import type { MapOutage } from "@/components/outage-map";
import { SURIGAO_CITY_BARANGAYS } from "@/lib/surigao-city-barangays";

interface MapControllerProps {
  focusBarangay: string | null;
}

function MapController({ focusBarangay }: MapControllerProps) {
  const map = useMap();

  useEffect(() => {
    if (!focusBarangay) return;
    const target = SURIGAO_CITY_BARANGAYS.find(
      (b) => b.name.toLowerCase() === focusBarangay.toLowerCase()
    );
    if (target) {
      map.flyTo([target.latitude, target.longitude], 14, { duration: 1.2 });
    }
  }, [focusBarangay, map]);

  return null;
}

interface PreviewLeafletMapProps {
  outages: MapOutage[];
  focusBarangay: string | null;
  onSelectBarangay?: (name: string) => void;
}

export default function PreviewLeafletMap({
  outages,
  focusBarangay,
  onSelectBarangay,
}: PreviewLeafletMapProps) {
  const [geoData, setGeoData] = useState<GeoJsonObject | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/surigao_city_barangays.json")
      .then((res) => res.json())
      .then((data) => {
        if (active) setGeoData(data);
      })
      .catch((err) => console.error("Could not load Surigao GeoJSON:", err));

    return () => {
      active = false;
    };
  }, []);

  // Determine status for each barangay from current outages
  function getBarangayStatus(name: string): "active" | "checking" | "restored" | "normal" {
    const matched = outages.find(
      (o) => o.area.toLowerCase().trim() === name.toLowerCase().trim()
    );
    if (!matched) return "normal";
    if (matched.status === "active") return "active";
    if (matched.status === "unconfirmed") return "checking";
    if (matched.status === "restored") return "restored";
    return "normal";
  }

  return (
    <div className="relative h-full w-full bg-[#081524]">
      <MapContainer
        center={[9.77, 125.48]}
        zoom={12}
        scrollWheelZoom={true}
        className="h-full w-full"
      >
        <MapController focusBarangay={focusBarangay} />

        {/* Humanitarian OpenStreetMap Layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://www.hotosm.org/">Humanitarian OpenStreetMap Team</a>'
          url="https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
          maxZoom={18}
        />

        {/* 54 Barangay Geometries */}
        {geoData && (
          <GeoJSON
            key={JSON.stringify(outages.map((o) => `${o.area}-${o.status}`))}
            data={geoData}
            style={(feature) => {
              const name = (
                feature?.properties?.adm4_en ||
                feature?.properties?.name ||
                ""
              ).trim();
              const status = getBarangayStatus(name);

              if (status === "active") {
                return {
                  color: "#e65c45",
                  weight: 3.5,
                  fillColor: "#e65c45",
                  fillOpacity: 0.45,
                };
              }
              if (status === "checking") {
                return {
                  color: "#d9a637",
                  weight: 3.5,
                  fillColor: "#d9a637",
                  fillOpacity: 0.45,
                };
              }
              if (status === "restored") {
                return {
                  color: "#438c6a",
                  weight: 3,
                  fillColor: "#438c6a",
                  fillOpacity: 0.35,
                };
              }
              return {
                color: "#2563eb",
                weight: 1.5,
                fillColor: "#0f172a",
                fillOpacity: 0.25,
              };
            }}
            onEachFeature={(feature, layer) => {
              const name =
                feature.properties.adm4_en ||
                feature.properties.name ||
                "Barangay";
              const status = getBarangayStatus(name);

              layer.bindTooltip(
                `<div style="font-weight:700;font-size:12px;">${name}</div><div style="font-size:10px;text-transform:uppercase;color:#94a3b8;">${status}</div>`,
                { direction: "center" }
              );

              layer.on("click", () => {
                if (onSelectBarangay) onSelectBarangay(name);
              });
            }}
          />
        )}

        {/* Cluster Circle Beacons */}
        {outages.map((outage) => {
          const isChecking = outage.status === "unconfirmed";
          const isActive = outage.status === "active";
          const color = isActive ? "#e65c45" : isChecking ? "#d9a637" : "#438c6a";

          return (
            <Circle
              key={outage.id}
              center={outage.coordinates}
              radius={480}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 0.75,
                weight: 3,
              }}
            >
              <Popup>
                <div className="p-1 text-slate-900">
                  <div className="font-bold text-[13px]">{outage.area}</div>
                  <div className="text-[11px] text-slate-600 mt-0.5">
                    {outage.reports} {outage.reports === 1 ? "report" : "reports"} · {outage.status}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    First reported: {outage.reported}
                  </div>
                </div>
              </Popup>
            </Circle>
          );
        })}
      </MapContainer>
    </div>
  );
}

