import { useEffect } from "react";
import L from "leaflet";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./couriers-map.css";

import type { ActiveCourier } from "@/lib/admin-api";
import { COURIER_STATUS_LABEL } from "@/components/tracking/courier-status";

/** Brazzaville — centre par défaut quand aucun point n'est disponible. */
const DEFAULT_CENTER: [number, number] = [-4.2634, 15.2429];

const STATUS_COLOR: Record<ActiveCourier["statut"], string> = {
  en_course: "#0B6B45",
  disponible: "#16A34A",
  hors_ligne: "#94A3B8",
};

/** Couleurs du trajet prévu : retrait (commerce) / destination (client). */
const PICKUP_COLOR = "#2563EB";
const DEST_COLOR = "#0F172A";
const ROUTE_COLOR = "#0B6B45";

function courierIcon(c: ActiveCourier): L.DivIcon {
  const color = STATUS_COLOR[c.statut];
  const initial = (c.nom || "?").charAt(0).toUpperCase();
  const pulse = c.statut === "en_course";
  const html = `<div class="ct-marker ${pulse ? "ct-marker--pulse" : ""}" style="--ct-color:${color}"><span class="ct-marker__dot">${initial}</span></div>`;
  return L.divIcon({
    html,
    className: "ct-marker-wrap",
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18],
  });
}

function formatDistance(km: number | null | undefined): string | null {
  if (km == null) return null;
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${Number(km).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} km`;
}

function shortAddress(addr: string): string {
  const clean = addr.trim();
  if (!clean) return "";
  // Garde les premiers éléments lisibles (commerce · quartier · rue…) sans
  // noyer la popup dans une adresse entière.
  const parts = clean.split(" · ").filter(Boolean).slice(0, 2);
  return parts.join(" · ") || clean;
}

/** Ajuste la vue pour englober tous les points (ou revient sur Brazzaville). */
function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  const key = points.map((p) => `${p[0].toFixed(4)},${p[1].toFixed(4)}`).join("|");

  useEffect(() => {
    if (points.length === 0) {
      map.setView(DEFAULT_CENTER, 12);
      return;
    }
    if (points.length === 1) {
      map.setView(points[0], 14);
      return;
    }
    map.fitBounds(L.latLngBounds(points.map((p) => L.latLng(p[0], p[1]))), {
      padding: [48, 48],
      maxZoom: 15,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);

  return null;
}

type Props = {
  couriers: ActiveCourier[];
};

export function ActiveCouriersMap({ couriers }: Props) {
  const withPosition = couriers.filter((c) => c.position);
  const enCourse = couriers.filter((c) => c.statut === "en_course" && c.course);

  // Trajets prévus (retrait → destination) des livreurs en course.
  const routes = enCourse
    .map((c) => {
      if (!c.course?.retrait || !c.course?.destination) return null;
      return {
        courier: c,
        positions: [
          [c.course.retrait.latitude, c.course.retrait.longitude],
          [c.course.destination.latitude, c.course.destination.longitude],
        ] as [number, number][],
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  const pickupPoints = enCourse
    .map((c) => (c.course?.retrait ? { courier: c, pos: c.course.retrait } : null))
    .filter((p): p is NonNullable<typeof p> => p !== null);

  const destPoints = enCourse
    .map((c) => (c.course?.destination ? { courier: c, pos: c.course.destination } : null))
    .filter((p): p is NonNullable<typeof p> => p !== null);

  const fitPoints = [
    ...withPosition.map((c) => [c.position!.latitude, c.position!.longitude] as [number, number]),
    ...pickupPoints.map((p) => [p.pos.latitude, p.pos.longitude] as [number, number]),
    ...destPoints.map((p) => [p.pos.latitude, p.pos.longitude] as [number, number]),
  ];

  return (
    <div className="relative h-[440px] w-full overflow-hidden rounded-xl border border-border shadow-sm">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={12}
        scrollWheelZoom
        className="ct-map h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <FitBounds points={fitPoints} />

        {/* Trajet prévu : point de retrait → destination */}
        {routes.map((r) => (
          <Polyline
            key={`route-${r.courier.id}`}
            positions={r.positions}
            pathOptions={{
              color: ROUTE_COLOR,
              weight: 2.5,
              opacity: 0.55,
              dashArray: "6 8",
            }}
          />
        ))}

        {/* Point de retrait (commerce) */}
        {pickupPoints.map((p) => (
          <CircleMarker
            key={`pickup-${p.courier.id}`}
            center={[p.pos.latitude, p.pos.longitude]}
            radius={7}
            pathOptions={{ color: "#fff", weight: 2.5, fillColor: PICKUP_COLOR, fillOpacity: 1 }}
          >
            <Popup>
              <div className="min-w-[180px]">
                <p className="ct-popup-name">Point de retrait</p>
                <p className="ct-popup-line">
                  {shortAddress(p.courier.course!.adresse_retrait) || "Commerce"}
                </p>
                <p className="ct-popup-line">Course {p.courier.course!.reference}</p>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {/* Destination (client) */}
        {destPoints.map((p) => (
          <CircleMarker
            key={`dest-${p.courier.id}`}
            center={[p.pos.latitude, p.pos.longitude]}
            radius={7}
            pathOptions={{ color: "#fff", weight: 2.5, fillColor: DEST_COLOR, fillOpacity: 1 }}
          >
            <Popup>
              <div className="min-w-[180px]">
                <p className="ct-popup-name">Livraison</p>
                <p className="ct-popup-line">
                  {shortAddress(p.courier.course!.adresse_livraison) || "Client"}
                </p>
                <p className="ct-popup-line">Course {p.courier.course!.reference}</p>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {/* Livreurs */}
        {withPosition.map((c) => (
          <Marker
            key={c.id}
            position={[c.position!.latitude, c.position!.longitude]}
            icon={courierIcon(c)}
          >
            <Popup>
              <div className="min-w-[190px]">
                <p className="ct-popup-name">{c.nom}</p>
                <p className="ct-popup-line">
                  {COURIER_STATUS_LABEL[c.statut]}
                  {c.type_vehicule ? ` · ${c.type_vehicule}` : ""}
                </p>
                {c.course ? (
                  <>
                    <p className="ct-popup-line">Course {c.course.reference}</p>
                    <p className="ct-popup-line">
                      {formatDistance(c.distance_km_restant)
                        ? `À ~${formatDistance(c.distance_km_restant)} du destinataire`
                        : "En route"}
                    </p>
                  </>
                ) : null}
                {c.position_age_min != null ? (
                  <p className="ct-popup-line">Position il y a {c.position_age_min} min</p>
                ) : null}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Légende — discrète, en bas à gauche */}
      <div className="pointer-events-none absolute bottom-3 left-3 z-[500] rounded-lg border border-border bg-background/90 px-3 py-2 shadow-sm backdrop-blur">
        <ul className="space-y-1 text-[11px] leading-none text-muted-foreground">
          <li className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0B6B45] opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#0B6B45]" />
            </span>
            Livreur en course
          </li>
          <li className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500" /> Livreur disponible
          </li>
          <li className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-400" /> Livreur hors ligne
          </li>
          <li className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full border-2 border-white bg-[#2563EB] shadow" />{" "}
            Point de retrait
          </li>
          <li className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full border-2 border-white bg-[#0F172A] shadow" />{" "}
            Destination
          </li>
          <li className="flex items-center gap-2">
            <span className="inline-block w-4 border-t-2 border-dashed border-[#0B6B45]" /> Trajet
            prévu
          </li>
        </ul>
      </div>

      {fitPoints.length === 0 ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p className="rounded-full border border-border bg-background/90 px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
            Aucune position partagée pour le moment
          </p>
        </div>
      ) : null}
    </div>
  );
}
