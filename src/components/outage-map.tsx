"use client";

import { useEffect, useState } from "react";
import {
  Circle,
  CircleMarker,
  GeoJSON,
  MapContainer,
  Popup,
  TileLayer,
  ZoomControl,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type { LatLngBoundsExpression, LatLngExpression, Layer } from "leaflet";
import type { GeoJsonObject } from "geojson";
import { SURIGAO_CITY_BARANGAYS, type BarangayOption } from "@/lib/surigao-city-barangays";

export type MapOutage = {
  id: string;
  area: string;
  city: string;
  status: "active" | "unconfirmed" | "restored";
  reports: number;
  coordinates: [number, number];
  reported: string;
  reportedAt?: string;
};

export type PowerStatus = "active" | "down" | "checking" | "restored";
export type PowerStateCategory = PowerStatus;

export interface BarangayPowerState {
  name: string;
  slug: string;
  code: string;
  power: boolean | null;
  status: PowerStatus;
  statusLabel: string;
  conditionText: string;
  badge: string;
  reports: number;
  duration: string;
  territory: string;
  coordinates: [number, number];
  color: string;
  stroke: string;
  fillOpacity: number;
  outageId?: string | null;
}

type OutageMapProps = {
  outages: MapOutage[];
  selectedId: string;
  onSelect: (id: string) => void;
  userLocation?: [number, number] | null;
  selectedCoordinates?: [number, number] | null;
  selectedAreaName?: string;
  dataAvailable?: boolean;
  onMapClick?: (coordinates: [number, number]) => void;
  onReportArea?: (barangayName: string, coordinates?: [number, number]) => void;
};

// Strict geofence: tightly locked to the 54 barangays of Surigao City
export const SURIGAO_BOUNDS: LatLngBoundsExpression = [
  [9.64, 125.40],
  [9.95, 125.76],
];

// Geographic center of the 54 Surigao City barangays
export const SURIGAO_CENTER: LatLngExpression = [9.79, 125.53];

function MapController({
  targetCoordinates,
  userLocation,
}: {
  targetCoordinates?: [number, number] | null;
  userLocation?: [number, number] | null;
}) {
  const map = useMap();

  // Invalidate size on mount to eliminate any grey-box / blank canvas bug
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);
    return () => clearTimeout(timer);
  }, [map]);

  // Fly to user location when requested
  useEffect(() => {
    if (userLocation && Number.isFinite(userLocation[0]) && Number.isFinite(userLocation[1])) {
      map.flyTo(userLocation, 14, { duration: 1.2 });
    }
  }, [userLocation, map]);

  // Fly to targeted coordinates (selected cluster or filtered barangay)
  useEffect(() => {
    if (targetCoordinates && Number.isFinite(targetCoordinates[0]) && Number.isFinite(targetCoordinates[1])) {
      map.flyTo(targetCoordinates, Math.max(map.getZoom(), 13), { duration: 0.9 });
    }
  }, [targetCoordinates, map]);

  return null;
}

function MapClickListener({ onMapClick }: { onMapClick?: (coordinates: [number, number]) => void }) {
  useMapEvents({
    click(event) {
      if (onMapClick) {
        onMapClick([event.latlng.lat, event.latlng.lng]);
      }
    },
  });
  return null;
}

// 4-Tier Power Palette
export const POWER_COLORS = {
  active: {
    stroke: "#16a34a",
    fill: "#22c55e",
    halo: "#22c55e",
    fillOpacity: 0.12,
    label: "Active",
    badge: "🟢 ACTIVE",
  },
  down: {
    stroke: "#dc2626",
    fill: "#ef4444",
    halo: "#ef4444",
    fillOpacity: 0.38,
    label: "Down",
    badge: "🔴 DOWN",
  },
  checking: {
    // flickering / unconfirmed reports
    stroke: "#d97706",
    fill: "#f59e0b",
    halo: "#f59e0b",
    fillOpacity: 0.28,
    label: "Checking",
    badge: "🟡 CHECKING",
  },
  restored: {
    // power restored < 24h
    stroke: "#2563eb",
    fill: "#3b82f6",
    halo: "#3b82f6",
    fillOpacity: 0.24,
    label: "Restored",
    badge: "🔵 RESTORED",
  },
};

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

export function resolveBarangayPower(
  barangay: BarangayOption,
  outages: MapOutage[]
): BarangayPowerState {
  const cleanName = normalizeName(barangay.name);
  const matchingOutage = outages.find(
    (o) => normalizeName(o.area) === cleanName
  );
  const territory = barangay.territory ?? "Surigao City Territory";

  if (!matchingOutage) {
    return {
      name: barangay.name,
      slug: barangay.slug,
      code: barangay.code,
      power: true,
      status: "active",
      statusLabel: "Active",
      conditionText: "Normal Grid Operation · Operational",
      badge: "🟢 ACTIVE",
      reports: 0,
      duration: "Normal continuous supply",
      territory,
      coordinates: [barangay.latitude, barangay.longitude],
      color: POWER_COLORS.active.fill,
      stroke: POWER_COLORS.active.stroke,
      fillOpacity: POWER_COLORS.active.fillOpacity,
      outageId: null,
    };
  }

  if (matchingOutage.status === "active") {
    return {
      name: barangay.name,
      slug: barangay.slug,
      code: barangay.code,
      power: false,
      status: "down",
      statusLabel: "Down",
      conditionText: "Outage Confirmed · Blackout in Progress",
      badge: "🔴 DOWN",
      reports: matchingOutage.reports,
      duration: matchingOutage.reported,
      territory,
      coordinates: matchingOutage.coordinates,
      color: POWER_COLORS.down.fill,
      stroke: POWER_COLORS.down.stroke,
      fillOpacity: POWER_COLORS.down.fillOpacity,
      outageId: matchingOutage.id,
    };
  }

  if (matchingOutage.status === "unconfirmed") {
    return {
      name: barangay.name,
      slug: barangay.slug,
      code: barangay.code,
      power: null,
      status: "checking",
      statusLabel: "Checking",
      conditionText: "Investigation in Progress · Flickering / Unconfirmed",
      badge: "🟡 CHECKING",
      reports: matchingOutage.reports,
      duration: matchingOutage.reported,
      territory,
      coordinates: matchingOutage.coordinates,
      color: POWER_COLORS.checking.fill,
      stroke: POWER_COLORS.checking.stroke,
      fillOpacity: POWER_COLORS.checking.fillOpacity,
      outageId: matchingOutage.id,
    };
  }

  return {
    name: barangay.name,
    slug: barangay.slug,
    code: barangay.code,
    power: true,
    status: "restored",
    statusLabel: "Restored",
    conditionText: "Service Restored · Monitoring Stability",
    badge: "🔵 RESTORED",
    reports: matchingOutage.reports,
    duration: matchingOutage.reported,
    territory,
    coordinates: matchingOutage.coordinates,
    color: POWER_COLORS.restored.fill,
    stroke: POWER_COLORS.restored.stroke,
    fillOpacity: POWER_COLORS.restored.fillOpacity,
    outageId: matchingOutage.id,
  };
}

export function getBarangayPowerInfo(name: string, outages: MapOutage[]): BarangayPowerState {
  const cleanName = normalizeName(name);
  const barangayMeta =
    SURIGAO_CITY_BARANGAYS.find((b) => normalizeName(b.name) === cleanName) ?? {
      name,
      slug: cleanName,
      code: "PH1606724000",
      latitude: 9.79,
      longitude: 125.53,
      territory: "Surigao City Territory",
    };

  return resolveBarangayPower(barangayMeta, outages);
}

export default function OutageMap({
  outages,
  selectedId,
  onSelect,
  userLocation,
  selectedCoordinates,
  selectedAreaName,
  dataAvailable = true,
  onMapClick,
  onReportArea,
}: OutageMapProps) {
  const selectedOutage = outages.find((outage) => outage.id === selectedId);
  const [barangayGeoJson, setBarangayGeoJson] = useState<GeoJsonObject | null>(null);

  const targetCoords = selectedOutage?.coordinates ?? selectedCoordinates;

  useEffect(() => {
    fetch("/surigao_city_barangays.json")
      .then((res) => res.json())
      .then((data) => setBarangayGeoJson(data as GeoJsonObject))
      .catch(() => undefined);
  }, []);

  return (
    <MapContainer
      center={SURIGAO_CENTER}
      zoom={11}
      minZoom={11}
      maxZoom={18}
      maxBounds={SURIGAO_BOUNDS}
      maxBoundsViscosity={1.0}
      zoomControl={false}
      scrollWheelZoom
      className="leaflet-map"
    >
      {/* High-performance Humanitarian OSM (HOT): 100% free, zero watermarks */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://www.hotosm.org/" target="_blank">Humanitarian OpenStreetMap Team</a>'
        url="https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <ZoomControl position="bottomright" />
      <MapController targetCoordinates={targetCoords} userLocation={userLocation} />
      <MapClickListener onMapClick={onMapClick} />

      {/* Official 54 Surigao City Barangay Boundary Outlines & Live Status */}
      {barangayGeoJson && (
        <GeoJSON
          key={`barangays-${dataAvailable}-${outages.map((o) => `${o.id}:${o.status}`).join(",")}-${selectedId}-${selectedAreaName ?? ""}`}
          data={barangayGeoJson}
          style={(feature) => {
            if (!dataAvailable) {
              return {
                color: "#7b8580",
                weight: 1,
                fillColor: "#aab2ad",
                fillOpacity: 0.12,
              };
            }
            const name = feature?.properties?.name ?? "";
            const info = getBarangayPowerInfo(name, outages);
            const isSelected =
              Boolean(selectedOutage?.area && normalizeName(selectedOutage.area) === normalizeName(name)) ||
              Boolean(selectedAreaName && normalizeName(selectedAreaName) === normalizeName(name));

            return {
              color: isSelected ? "#0f172a" : info.stroke,
              weight: isSelected ? 3.5 : info.status === "down" ? 2.2 : 1.2,
              fillColor: info.color,
              fillOpacity: isSelected ? Math.min(info.fillOpacity + 0.25, 0.65) : info.fillOpacity,
              dashArray:
                info.status === "checking"
                  ? "4, 4"
                  : info.status === "active"
                  ? "2, 3"
                  : undefined,
            };
          }}
          onEachFeature={(feature, layer: Layer) => {
            const name = feature.properties?.name;
            if (!name) return;
            if (!dataAvailable) {
              layer.bindTooltip("Outage data unavailable", { sticky: true, direction: "top", opacity: 0.95 });
              return;
            }
            const info = getBarangayPowerInfo(name, outages);
            const safeName = escapeHtml(name);

            // Hover tooltip
            layer.bindTooltip(
              `<div style="font-family:system-ui,sans-serif;font-size:11px;font-weight:600;padding:3px 6px;">
                <div style="font-weight:700;color:#0f172a;">Brgy. ${safeName}</div>
                <div style="font-size:10px;margin-top:2px;color:${info.stroke};font-weight:700;">
                  ${escapeHtml(info.badge)}
                </div>
              </div>`,
              { sticky: true, direction: "top", opacity: 0.95 }
            );

            // Click popup with full details
            const popupHtml = `
              <div style="min-width:220px;font-family:system-ui,-apple-system,sans-serif;padding:3px;color:#1e293b;">
                <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding-bottom:6px;margin-bottom:6px;">
                  <strong style="font-size:13px;color:#0f172a;">Brgy. ${safeName}</strong>
                  <span style="font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;background:${info.color}25;color:${info.stroke};border:1px solid ${info.stroke}40;text-transform:uppercase;">
                    ${escapeHtml(info.status)}
                  </span>
                </div>
                <div style="font-size:10px;color:#64748b;margin-bottom:8px;font-weight:500;">
                  📍 ${escapeHtml(info.territory)} · Surigao City
                </div>
                <div style="font-size:11px;line-height:1.5;margin-bottom:10px;background:#f8fafc;padding:6px 8px;border-radius:4px;border:1px solid #edf2f7;">
                  <div><span style="color:#64748b;">Power status:</span> <strong style="color:${info.stroke};">${escapeHtml(info.statusLabel)}</strong></div>
                  <div><span style="color:#64748b;">Grid condition:</span> <strong>${escapeHtml(info.conditionText)}</strong></div>
                  <div><span style="color:#64748b;">Community reports:</span> <strong>${info.reports} signal(s)</strong></div>
                  <div><span style="color:#64748b;">Timeline:</span> <strong>${escapeHtml(info.duration)}</strong></div>
                  <div><span style="color:#64748b;">Coordinates:</span> <strong>${info.coordinates[0].toFixed(4)}° N, ${info.coordinates[1].toFixed(4)}° E</strong></div>
                </div>
                <button
                  type="button"
                  data-report-area
                  style="width:100%;cursor:pointer;background:#059669;color:#ffffff;border:none;border-radius:4px;padding:6px 8px;font-size:11px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:4px;"
                >
                  ⚡ Report Power Issue for Brgy. ${safeName}
                </button>
              </div>
            `;
            layer.bindPopup(popupHtml, { maxWidth: 280 });
            layer.on("popupopen", (event) => {
              const button = event.popup.getElement()?.querySelector<HTMLButtonElement>("[data-report-area]");
              if (!button || button.dataset.handlerBound) return;
              button.dataset.handlerBound = "true";
              button.addEventListener("click", () => onReportArea?.(name, info.coordinates));
            });

            // Layer click handler
            layer.on({
              click: () => {
                if (info.outageId) {
                  onSelect(info.outageId);
                }
              },
            });
          }}
        />
      )}

      {/* User Live GPS Marker */}
      {userLocation && (
        <>
          <Circle
            center={userLocation}
            radius={250}
            pathOptions={{ color: "#2563eb", fillColor: "#3b82f6", fillOpacity: 0.15, weight: 1 }}
          />
          <CircleMarker
            center={userLocation}
            radius={8}
            pathOptions={{ color: "#ffffff", fillColor: "#2563eb", fillOpacity: 1, weight: 2 }}
          >
            <Popup>
              <strong>Your Live Location</strong>
              <br />
              GPS coordinates captured
            </Popup>
          </CircleMarker>
        </>
      )}

      {/* 500-Meter Outage Clusters matching backend spatial grouping */}
      {outages.map((outage) => {
        const selected = outage.id === selectedId;
        const colorPalette =
          outage.status === "active"
            ? POWER_COLORS.down
            : outage.status === "unconfirmed"
            ? POWER_COLORS.checking
            : POWER_COLORS.restored;

        return (
          <span key={outage.id}>
            {/* 500-meter cluster radius halo */}
            <Circle
              center={outage.coordinates}
              radius={500}
              pathOptions={{
                color: colorPalette.stroke,
                fillColor: colorPalette.halo,
                fillOpacity: selected ? 0.28 : 0.15,
                weight: selected ? 2.5 : 1,
                dashArray: outage.status === "unconfirmed" ? "5, 5" : undefined,
              }}
              eventHandlers={{ click: () => onSelect(outage.id) }}
            />
            {/* Central Cluster Pin */}
            <CircleMarker
              center={outage.coordinates}
              radius={selected ? 13 : Math.min(8 + outage.reports, 14)}
              pathOptions={{
                color: "#fffdf8",
                weight: selected ? 3.5 : 2,
                fillColor: colorPalette.fill,
                fillOpacity: outage.status === "restored" ? 0.8 : 0.95,
              }}
              eventHandlers={{ click: () => onSelect(outage.id) }}
            >
              <Popup>
                <div style={{ minWidth: 170, fontFamily: "system-ui, sans-serif" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong style={{ fontSize: 13 }}>{outage.area}</strong>
                    <span
                      style={{
                        fontSize: 9,
                        padding: "1px 5px",
                        borderRadius: 3,
                        fontWeight: 700,
                        backgroundColor: `${colorPalette.fill}20`,
                        color: colorPalette.stroke,
                      }}
                    >
                      {outage.status === "active" ? "DOWN" : outage.status.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>{outage.city}</div>
                  <div style={{ marginTop: 6, fontSize: 11, fontWeight: 600 }}>
                    {outage.reports} {outage.reports === 1 ? "report" : "reports"} ·{" "}
                    <span style={{ color: colorPalette.stroke }}>{colorPalette.label}</span>
                  </div>
                  <div style={{ fontSize: 10, color: "#888", marginTop: 2 }}>{outage.reported}</div>
                  <button
                    type="button"
                    onClick={() => onReportArea?.(outage.area, outage.coordinates)}
                    style={{
                      width: "100%",
                      marginTop: 8,
                      cursor: "pointer",
                      background: "#059669",
                      color: "#fff",
                      border: "none",
                      borderRadius: 4,
                      padding: "5px 8px",
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  >
                    ⚡ Submit Update for this Cluster
                  </button>
                </div>
              </Popup>
            </CircleMarker>
          </span>
        );
      })}
    </MapContainer>
  );
}
