import React, { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  Circle,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import Navbar from "../components/Navbar";
import { useTranslation } from "react-i18next";
// --- CẤU HÌNH ICON LEAFLET ---
import iconMarker from "leaflet/dist/images/marker-icon.png";
import iconRetina from "leaflet/dist/images/marker-icon-2x.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import iconHospital from "../assets/icons/hospital.png";
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetina,
  iconUrl: iconMarker,
  shadowUrl: iconShadow,
});

const HOSPITAL_IMG = iconHospital;
const PHARMACY_IMG = "https://cdn-icons-png.flaticon.com/512/3022/3022709.png";
const CLINIC_IMG = "https://cdn-icons-png.flaticon.com/512/2966/2966334.png";
const USER_IMG = "https://cdn-icons-png.flaticon.com/512/9356/9356230.png";

const getPlaceImg = (type) => {
  if (type === "hospital") return HOSPITAL_IMG;
  if (type === "pharmacy") return PHARMACY_IMG;
  return CLINIC_IMG;
};

// --- Cấu hình Icon cho Map Marker ---
const hospitalIcon = new L.Icon({
  iconUrl: HOSPITAL_IMG,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const pharmacyIcon = new L.Icon({
  iconUrl: PHARMACY_IMG,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
});

const clinicIcon = new L.Icon({
  iconUrl: CLINIC_IMG,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
});

const userIcon = new L.Icon({
  iconUrl: USER_IMG,
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

// =======================================================

const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

function MapController({ center, zoom, userPosition }) {
  const map = useMap();
  const { t } = useTranslation();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom || 16, { duration: 1.2 });
    }
  }, [center, zoom, map]);

  const handleRecenter = (e) => {
    e.stopPropagation();
    if (userPosition) {
      map.flyTo(userPosition, 15, { duration: 1.5 });
    }
  };

  return (
    <div
      className="leaflet-bottom leaflet-right"
      style={{
        marginBottom: "20px",
        marginRight: "10px",
        pointerEvents: "auto",
      }}
    >
      <div className="leaflet-control leaflet-bar">
        <button
          onClick={handleRecenter}
          title={t("map.back_to_my_location")}
          style={{
            width: "40px",
            height: "40px",
            backgroundColor: "white",
            border: "2px solid #3b82f6",
            borderRadius: "50%",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="12" cy="12" r="10" stroke="#3b82f6" strokeWidth="2" />
            <circle cx="12" cy="12" r="4" fill="#3b82f6" />
            <path
              d="M12 2V4M12 20V22M2 12H4M20 12H22"
              stroke="#3b82f6"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

const HealthMap = ({ user, onLogout }) => {
  const { t } = useTranslation();
  const [position, setPosition] = useState(null);
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setPosition([latitude, longitude]);
          fetchNearbyPlaces(latitude, longitude);
        },
        (err) => {
          console.error("Lỗi GPS:", err);
          const defaultPos = [16.0544, 108.2022];
          setPosition(defaultPos);
          fetchNearbyPlaces(defaultPos[0], defaultPos[1]);
        },
      );
    }
  }, []);

  const fetchNearbyPlaces = async (lat, lon) => {
    setLoading(true);
    const query = `
      [out:json][timeout:25];
      (
        node["amenity"="pharmacy"](around:7000,${lat},${lon});
        way["amenity"="pharmacy"](around:7000,${lat},${lon});
        node["healthcare"="pharmacy"](around:7000,${lat},${lon});
        
        node["amenity"="hospital"](around:7000,${lat},${lon});
        way["amenity"="hospital"](around:7000,${lat},${lon});
        
        node["amenity"="clinic"](around:7000,${lat},${lon});
        way["amenity"="clinic"](around:7000,${lat},${lon});
        node["amenity"="dentist"](around:7000,${lat},${lon});
        node["healthcare"="doctor"](around:7000,${lat},${lon});
      );
      out center;
    `;

    try {
      const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
      const res = await fetch(url);
      const data = await res.json();

      let formatted = data.elements
        .map((el) => {
          const pLat = el.lat || el.center?.lat;
          const pLon = el.lon || el.center?.lon;
          let typeLabel = "clinic";
          let tags = el.tags || {};

          if (tags.amenity === "pharmacy" || tags.healthcare === "pharmacy")
            typeLabel = "pharmacy";
          else if (tags.amenity === "hospital") typeLabel = "hospital";
          else if (tags.amenity === "dentist") typeLabel = "clinic";

          let name = tags.name;
          if (!name) {
            if (typeLabel === "pharmacy") name = t("map.pharmacy");
            else if (typeLabel === "hospital") name = t("map.hospital");
            else name = t("map.clinic");
          }

          const rawDist = getDistance(lat, lon, pLat, pLon);
          const estimatedDist = rawDist * 1.3;

          return {
            id: el.id,
            lat: pLat,
            lon: pLon,
            name: name,
            type: typeLabel,
            address: tags["addr:street"]
              ? `${tags["addr:housenumber"] || ""} ${tags["addr:street"]}`
              : t("map.danang", "Đà Nẵng"),
            distance: estimatedDist,
          };
        })
        .filter((item) => item.lat && item.lon);

      formatted.sort((a, b) => a.distance - b.distance);
      setPlaces(formatted);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlace = (place) => {
    setSelectedPlace(place);
  };

  const getIcon = (type) => {
    if (type === "hospital") return hospitalIcon;
    if (type === "pharmacy") return pharmacyIcon;
    return clinicIcon;
  };

  const formatDistance = (meters) => {
    if (!meters) return "...";
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  return (
    <div className="health-map-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&display=swap');

        .health-map-page { 
          display: flex; 
          flex-direction: column; 
          height: 100vh; 
          background-color: #f0f2f5; 
          overflow: hidden;
          font-family: 'Be Vietnam Pro', sans-serif !important; /* Áp dụng font cho toàn trang */
        }
        
        /* Chỉnh Popup trong suốt để dùng Card của mình */
        .leaflet-popup-content-wrapper, .leaflet-popup-tip { 
          background: transparent !important; 
          box-shadow: none !important; 
          border: none !important; 
        }
        .leaflet-popup-content { 
          margin: 0 !important; 
          width: 300px !important; 
        }
        .leaflet-popup-close-button { 
          display: none; 
        }
      `}</style>

      <div className="flex-none z-50 shadow-sm bg-white">
        <Navbar user={user} onLogout={onLogout} />
      </div>

      <div className="flex flex-1 relative mt-[60px] h-[calc(100vh-60px)]">
        {/* SIDEBAR */}
        <div className="w-[400px] min-w-[350px] bg-white shadow-xl z-20 flex flex-col border-r border-gray-200">
          <div className="p-4 border-b border-gray-100 bg-white shadow-sm z-10">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              {t("map.nearby_health")}
            </h3>
            <p className="text-sm text-gray-500 mt-1 font-medium">
              {loading ? (
                <span className="text-blue-600 animate-pulse">
                  {t("map.finding_nearest")}
                </span>
              ) : (
                t("map.found_places", { count: places.length })
              )}
            </p>
          </div>

          <ul className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2 bg-gray-50">
            {places.map((p) => {
              const isSelected = selectedPlace?.id === p.id;
              return (
                <li
                  key={p.id}
                  onClick={() => handleSelectPlace(p)}
                  className={`
                    group flex items-start p-3 rounded-xl cursor-pointer transition-all duration-200 border relative overflow-hidden
                    ${
                      isSelected
                        ? "bg-white border-blue-500 shadow-md ring-1 ring-blue-500"
                        : "bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm"
                    }
                  `}
                >
                  {isSelected && (
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500"></div>
                  )}

                  <div
                    className={`
                    w-12 h-12 rounded-full flex flex-col items-center justify-center shadow-sm border mr-3 shrink-0
                    ${p.type === "hospital" ? "bg-red-50 text-red-500 border-red-100" : "bg-blue-50 text-blue-600 border-blue-100"}
                  `}
                  >
                    <img
                      src={getPlaceImg(p.type)}
                      alt={p.type}
                      className="w-6 h-6 object-contain mb-0.5"
                    />
                    <span className="text-[10px] font-bold text-gray-700">
                      {formatDistance(p.distance)}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[15px] truncate text-slate-800">
                      {p.name}
                    </div>
                    <div className="text-[13px] text-gray-500 truncate mt-0.5">
                      {p.address}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* MAP */}
        <div className="flex-1 relative bg-gray-100">
          {position ? (
            <MapContainer
              center={position}
              zoom={14}
              style={{ height: "100%", width: "100%" }}
              zoomControl={false}
            >
              <MapController
                center={
                  selectedPlace
                    ? [selectedPlace.lat, selectedPlace.lon]
                    : position
                }
                zoom={selectedPlace ? 16 : 14}
                userPosition={position}
              />

              <TileLayer
                attribution="© OpenStreetMap & CARTO"
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              />

              <Marker position={position} icon={userIcon}>
                <Popup>{t("map.your_location")}</Popup>
              </Marker>

              {/* Chỉ hiển thị 30 địa điểm gần nhất */}
              {places.slice(0, 30).map((p) => {
                const isSelected = selectedPlace?.id === p.id;

                return (
                  <React.Fragment key={p.id}>
                    {isSelected && (
                      <>
                        <Circle
                          center={[p.lat, p.lon]}
                          radius={180}
                          pathOptions={{
                            color: "#22c55e",
                            fillColor: "#22c55e",
                            fillOpacity: 0.15,
                            weight: 1,
                            dashArray: "6, 8",
                          }}
                        />
                        <Circle
                          center={[p.lat, p.lon]}
                          radius={40}
                          pathOptions={{
                            color: "#ffffff",
                            weight: 3,
                            fillColor: "#22c55e",
                            fillOpacity: 0.8,
                          }}
                        />
                      </>
                    )}

                    <Marker
                      position={[p.lat, p.lon]}
                      icon={getIcon(p.type)}
                      zIndexOffset={isSelected ? 1000 : 0}
                      eventHandlers={{ click: () => handleSelectPlace(p) }}
                    >
                      {isSelected && (
                        <Popup
                          className="custom-popup"
                          autoPan={false}
                          closeButton={false}
                        >
                          <div className="bg-gray-100 border-2 border-blue-500 rounded-[24px] p-5 text-center shadow-2xl min-w-[280px] relative font-sans">
                            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-gray-100 border-b-2 border-r-2 border-blue-500 rotate-45 z-10"></div>

                            <h3 className="text-[17px] font-bold text-slate-800 mb-1 leading-6 tracking-tight">
                              {p.name}
                            </h3>

                            <div className="text-[14px] font-semibold text-slate-600 mb-2 flex items-center justify-center gap-1">
                              <span>📍 {t("map.distance_from_you")}</span>
                              <span className="text-blue-600 font-bold text-[15px]">
                                {formatDistance(p.distance)}
                              </span>
                            </div>

                            <div className="text-[13px] text-slate-500 mb-4 px-2 line-clamp-2 leading-5">
                              {p.address}
                            </div>

                            <a
                              href={`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lon}`}
                              target="_blank"
                              rel="noreferrer"
                              className="
                                flex items-center justify-center gap-2 w-full
                                bg-blue-500 hover:bg-blue-400
                                text-white !text-white 
                                text-[14px] font-semibold tracking-wide
                                py-3 rounded-xl
                                shadow-md hover:shadow-xl hover:shadow-blue-400/60
                                transition-all duration-200 ease-in-out
                                active:scale-95 no-underline
                              "
                            >
                              <span className="text-lg">🚀</span>{" "}
                              {t("map.directions")}
                            </a>
                          </div>
                        </Popup>
                      )}
                    </Marker>
                  </React.Fragment>
                );
              })}
            </MapContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center bg-gray-50 text-gray-400">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-4"></div>
              <p>{t("map.loading_map")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HealthMap;
