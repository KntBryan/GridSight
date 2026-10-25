"use client";

import { useEffect } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, ZoomControl, useMap } from "react-leaflet";
import type { LatLngExpression } from "leaflet";

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

type OutageMapProps = {
  outages: MapOutage[];
  selectedId: string;
  onSelect: (id: string) => void;
  userLocation?: [number, number] | null;
};

function MapViewUpdater({ center, zoom }: { center?: [number, number] | null; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom ?? 13, { duration: 1.2 });
    }
  }, [center, zoom, map]);
  return null;
}

const colors = {
  active: "#e65c45",
  unconfirmed: "#e5af40",
  restored: "#438c6a",
};

export default function OutageMap({ outages, selectedId, onSelect, userLocation }: OutageMapProps) {
  const center: LatLngExpression = [9.7878, 125.4916];

  return (
    <MapContainer center={center} zoom={11} zoomControl={false} scrollWheelZoom className="leaflet-map">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ZoomControl position="bottomright" />
      <MapViewUpdater center={userLocation} />

      {userLocation && (
        <>
          <CircleMarker
            center={userLocation}
            radius={18}
            pathOptions={{ color: "#2563eb", fillColor: "#3b82f6", fillOpacity: 0.18, weight: 1 }}
          />
          <CircleMarker
            center={userLocation}
            radius={7}
            pathOptions={{ color: "#ffffff", fillColor: "#2563eb", fillOpacity: 1, weight: 2 }}
          >
            <Popup>
              <strong>Your location</strong>
            </Popup>
          </CircleMarker>
        </>
      )}

      {outages.map((outage) => {
        const selected = outage.id === selectedId;
        return (
          <CircleMarker
            key={outage.id}
            center={outage.coordinates}
            radius={selected ? 13 : Math.min(8 + outage.reports, 15)}
            pathOptions={{
              color: "#fffdf8",
              weight: selected ? 4 : 2,
              fillColor: colors[outage.status],
              fillOpacity: outage.status === "restored" ? 0.68 : 0.9,
            }}
            eventHandlers={{ click: () => onSelect(outage.id) }}
          >
            <Popup>
              <strong>{outage.area}</strong>
              <br />
              {outage.reports} community reports · {outage.status}
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
