"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";

export interface Datacenter {
  id: string;
  name: string;
  city: string;
  country: string;
  flag: string;
  lat: number;
  lng: number;
  fallbackPing: number;
}

export interface UserLocation {
  lat: number;
  lng: number;
  city?: string;
  country?: string;
  isp?: string;
}

export const DATACENTERS: Datacenter[] = [
  {
    id: "lk-colombo",
    name: "Colombo",
    city: "Colombo",
    country: "Sri Lanka",
    flag: "🇱🇰",
    lat: 6.9271,
    lng: 79.8612,
    fallbackPing: 8,
  },
  {
    id: "in-mumbai",
    name: "Mumbai",
    city: "Mumbai",
    country: "India",
    flag: "🇮🇳",
    lat: 19.076,
    lng: 72.8777,
    fallbackPing: 32,
  },
  {
    id: "in-chennai",
    name: "Chennai",
    city: "Chennai",
    country: "India",
    flag: "🇮🇳",
    lat: 13.0827,
    lng: 80.2707,
    fallbackPing: 22,
  },
  {
    id: "sg-singapore",
    name: "Singapore",
    city: "Singapore",
    country: "Singapore",
    flag: "🇸🇬",
    lat: 1.3521,
    lng: 103.8198,
    fallbackPing: 44,
  },
  {
    id: "hk-hongkong",
    name: "Hong Kong",
    city: "Hong Kong",
    country: "Hong Kong",
    flag: "🇭🇰",
    lat: 22.3193,
    lng: 114.1694,
    fallbackPing: 54,
  },
  {
    id: "ae-dubai",
    name: "Dubai",
    city: "Dubai",
    country: "UAE",
    flag: "🇦🇪",
    lat: 25.2048,
    lng: 55.2708,
    fallbackPing: 58,
  },
  {
    id: "jp-tokyo",
    name: "Tokyo",
    city: "Tokyo",
    country: "Japan",
    flag: "🇯🇵",
    lat: 35.6762,
    lng: 139.6503,
    fallbackPing: 94,
  },
  {
    id: "kr-seoul",
    name: "Seoul",
    city: "Seoul",
    country: "South Korea",
    flag: "🇰🇷",
    lat: 37.5665,
    lng: 126.978,
    fallbackPing: 86,
  },
  {
    id: "de-frankfurt",
    name: "Frankfurt",
    city: "Frankfurt",
    country: "Germany",
    flag: "🇩🇪",
    lat: 50.1109,
    lng: 8.6821,
    fallbackPing: 118,
  },
  {
    id: "gb-london",
    name: "London",
    city: "London",
    country: "United Kingdom",
    flag: "🇬🇧",
    lat: 51.5074,
    lng: -0.1278,
    fallbackPing: 126,
  },
  {
    id: "us-virginia",
    name: "Virginia",
    city: "Virginia",
    country: "USA",
    flag: "🇺🇸",
    lat: 39.0438,
    lng: -77.4874,
    fallbackPing: 215,
  },
  {
    id: "us-california",
    name: "California",
    city: "California",
    country: "USA",
    flag: "🇺🇸",
    lat: 37.3382,
    lng: -121.8863,
    fallbackPing: 238,
  },
  {
    id: "au-sydney",
    name: "Sydney",
    city: "Sydney",
    country: "Australia",
    flag: "🇦🇺",
    lat: -33.8688,
    lng: 151.2093,
    fallbackPing: 112,
  },
  {
    id: "za-johannesburg",
    name: "Johannesburg",
    city: "Johannesburg",
    country: "South Africa",
    flag: "🇿🇦",
    lat: -26.2041,
    lng: 28.0473,
    fallbackPing: 168,
  },
  {
    id: "br-saopaulo",
    name: "São Paulo",
    city: "São Paulo",
    country: "Brazil",
    flag: "🇧🇷",
    lat: -23.5505,
    lng: -46.6333,
    fallbackPing: 265,
  },
];

function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

type SceneControls = {
  updateUserMarker: (loc: UserLocation | null) => void;
  setTargetRotation: (dc: Datacenter | null) => void;
  updateNodeHighlights: (selectedId: string | null) => void;
};

export function LatencyGlobe() {
  const mountRef = useRef<HTMLDivElement>(null);
  const calloutRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const userLabelRef = useRef<HTMLDivElement | null>(null);

  const [selectedDc, setSelectedDc] = useState<Datacenter | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [ping, setPing] = useState<number | null>(null);
  const [isPinging, setIsPinging] = useState(false);

  const selectedDcRef = useRef<Datacenter | null>(null);
  const currentSelectedDcRef = useRef<Datacenter | null>(null);
  const currentUserLocationRef = useRef<UserLocation | null>(null);
  const sceneControlsRef = useRef<SceneControls | null>(null);

  const measurePing = useCallback(
    async (dc: Datacenter, overrideLocation?: UserLocation) => {
      setIsPinging(true);
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const start = performance.now();
        await fetch("/api/ping", {
          cache: "no-store",
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        const measuredBase = Math.round(performance.now() - start);

        const loc = overrideLocation ?? currentUserLocationRef.current;
        const originLat = loc?.lat ?? 6.9271;
        const originLng = loc?.lng ?? 79.8612;
        const distKm = getDistanceKm(originLat, originLng, dc.lat, dc.lng);

        if (distKm < 60) {
          setPing(Math.max(4, Math.min(10, measuredBase)));
        } else {
          const calculated = Math.round(distKm * 0.016 + Math.min(measuredBase, 20));
          setPing(Math.max(10, calculated));
        }
      } catch {
        const loc = overrideLocation ?? currentUserLocationRef.current;
        const originLat = loc?.lat ?? 6.9271;
        const originLng = loc?.lng ?? 79.8612;
        const distKm = getDistanceKm(originLat, originLng, dc.lat, dc.lng);
        const fallbackCalculated = Math.round(distKm * 0.016 + 10);
        setPing(Math.max(10, fallbackCalculated));
      } finally {
        setIsPinging(false);
      }
    },
    [],
  );

  const selectDatacenter = useCallback(
    (dc: Datacenter) => {
      selectedDcRef.current = dc;
      setSelectedDc(dc);
      setPing(null);
      measurePing(dc);
    },
    [measurePing],
  );

  useEffect(() => {
    let isMounted = true;

    async function detectUserLocation() {
      try {
        const pingRes = await fetch("/api/ping", { cache: "no-store" });
        const pingData = await pingRes.json();
        if (isMounted && pingData?.geo?.lat && pingData?.geo?.lng) {
          const loc: UserLocation = {
            lat: Number(pingData.geo.lat),
            lng: Number(pingData.geo.lng),
            city: pingData.geo.city,
            country: pingData.geo.country,
            isp: pingData.geo.isp,
          };
          currentUserLocationRef.current = loc;
          setUserLocation(loc);
          return;
        }
      } catch {}

      try {
        const res = await fetch("https://ipwho.is/");
        const data = await res.json();
        if (isMounted && data?.latitude && data?.longitude) {
          const loc: UserLocation = {
            lat: Number(data.latitude),
            lng: Number(data.longitude),
            city: data.city,
            country: data.country,
            isp: data.connection?.isp || data.connection?.org,
          };
          currentUserLocationRef.current = loc;
          setUserLocation(loc);
          return;
        }
      } catch {}

      try {
        const res = await fetch("https://freeipapi.com/api/json");
        const data = await res.json();
        if (isMounted && data?.latitude && data?.longitude) {
          const loc: UserLocation = {
            lat: Number(data.latitude),
            lng: Number(data.longitude),
            city: data.cityName || data.city,
            country: data.countryName || data.country,
            isp: data.asnOrganization,
          };
          currentUserLocationRef.current = loc;
          setUserLocation(loc);
          return;
        }
      } catch {}

      try {
        const res = await fetch("https://api.country.is/");
        const data = await res.json();
        if (isMounted && data?.country) {
          const match = DATACENTERS.find((d) =>
            d.country.toLowerCase().includes(data.country.toLowerCase()),
          );
          if (match) {
            const loc: UserLocation = {
              lat: match.lat,
              lng: match.lng,
              city: match.city,
              country: match.country,
            };
            currentUserLocationRef.current = loc;
            setUserLocation(loc);
            return;
          }
        }
      } catch {}
    }

    detectUserLocation();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let containerW = container.clientWidth || 440;
    let containerH = container.clientHeight || 420;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, containerW / containerH, 0.1, 1000);
    camera.position.z = 200;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(containerW, containerH);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const globeRadius = 76;
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    const dcPositions = DATACENTERS.map((dc) => ({
      dc,
      pos: latLngToVector3(dc.lat, dc.lng, globeRadius + 1.2),
    }));

    const atmoGeo = new THREE.RingGeometry(globeRadius + 0.4, globeRadius + 3.8, 64);
    const atmoMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.24,
    });
    const atmoMesh = new THREE.Mesh(atmoGeo, atmoMat);
    scene.add(atmoMesh);

    const coreGeo = new THREE.SphereGeometry(globeRadius - 0.5, 36, 36);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.85,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    globeGroup.add(coreMesh);

    const sphereGeometry = new THREE.SphereGeometry(globeRadius, 28, 28);
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0x52525b,
      wireframe: true,
      transparent: true,
      opacity: 0.28,
    });
    const sphereMesh = new THREE.Mesh(sphereGeometry, wireframeMaterial);
    globeGroup.add(sphereMesh);

    const equatorGeo = new THREE.RingGeometry(globeRadius - 0.3, globeRadius + 0.3, 64);
    const equatorMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.45,
    });
    const equator = new THREE.Mesh(equatorGeo, equatorMat);
    equator.rotation.x = Math.PI / 2;
    globeGroup.add(equator);

    const particleCount = 1400;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = globeRadius + (Math.random() * 0.5 - 0.25);

      const sinPhi = Math.sin(phi);
      particlePositions[i * 3] = r * sinPhi * Math.cos(theta);
      particlePositions[i * 3 + 1] = r * Math.cos(phi);
      particlePositions[i * 3 + 2] = r * sinPhi * Math.sin(theta);
    }

    const dotGeo = new THREE.BufferGeometry();
    dotGeo.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    const dotMat = new THREE.PointsMaterial({
      color: 0x334155,
      size: 1.45,
      transparent: true,
      opacity: 0.75,
    });
    const dotsMesh = new THREE.Points(dotGeo, dotMat);
    globeGroup.add(dotsMesh);

    let userNodeMesh: THREE.Mesh | null = null;
    let userRingMesh: THREE.Mesh | null = null;
    let userMarkerGeo: THREE.SphereGeometry | null = null;
    let userMarkerMat: THREE.MeshBasicMaterial | null = null;
    let userRingGeo: THREE.RingGeometry | null = null;
    let userRingMat: THREE.MeshBasicMaterial | null = null;

    const updateUserMarker = (loc: UserLocation | null) => {
      if (!loc) {
        if (userNodeMesh) userNodeMesh.visible = false;
        if (userRingMesh) userRingMesh.visible = false;
        return;
      }
      const uPos = latLngToVector3(loc.lat, loc.lng, globeRadius + 1.2);
      if (!userNodeMesh) {
        userMarkerGeo = new THREE.SphereGeometry(3.6, 16, 16);
        userMarkerMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 });
        userNodeMesh = new THREE.Mesh(userMarkerGeo, userMarkerMat);
        globeGroup.add(userNodeMesh);
      }
      userNodeMesh.position.copy(uPos);
      userNodeMesh.visible = true;

      if (!userRingMesh) {
        userRingGeo = new THREE.RingGeometry(4.2, 6.2, 24);
        userRingMat = new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.85,
        });
        userRingMesh = new THREE.Mesh(userRingGeo, userRingMat);
        globeGroup.add(userRingMesh);
      }
      userRingMesh.position.copy(uPos);
      userRingMesh.lookAt(new THREE.Vector3(0, 0, 0));
      userRingMesh.visible = true;
    };

    const clickTargets: THREE.Mesh[] = [];
    const nodeMeshes: {
      dc: Datacenter;
      marker: THREE.Mesh;
      markerMat: THREE.MeshBasicMaterial;
      ring: THREE.Mesh;
      ringMat: THREE.MeshBasicMaterial;
    }[] = [];

    DATACENTERS.forEach((dc) => {
      const pos = latLngToVector3(dc.lat, dc.lng, globeRadius + 1.2);

      const markerGeo = new THREE.SphereGeometry(2.8, 16, 16);
      const markerMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });
      const marker = new THREE.Mesh(markerGeo, markerMat);
      marker.position.copy(pos);
      globeGroup.add(marker);

      const nodeRingGeo = new THREE.RingGeometry(3.4, 5.0, 24);
      const nodeRingMat = new THREE.MeshBasicMaterial({
        color: 0x64748b,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6,
      });
      const nodeRing = new THREE.Mesh(nodeRingGeo, nodeRingMat);
      nodeRing.position.copy(pos);
      nodeRing.lookAt(new THREE.Vector3(0, 0, 0));
      globeGroup.add(nodeRing);

      nodeMeshes.push({ dc, marker, markerMat, ring: nodeRing, ringMat: nodeRingMat });

      const hitGeo = new THREE.SphereGeometry(12.0, 10, 10);
      const hitMat = new THREE.MeshBasicMaterial({ visible: false });
      const hitMesh = new THREE.Mesh(hitGeo, hitMat);
      hitMesh.position.copy(pos);
      hitMesh.userData = { datacenter: dc };
      globeGroup.add(hitMesh);
      clickTargets.push(hitMesh);
    });

    const updateNodeHighlights = (selectedId: string | null) => {
      nodeMeshes.forEach(({ dc, marker, markerMat, ring, ringMat }) => {
        const isSelected = selectedId === dc.id;
        markerMat.color.setHex(isSelected ? 0x10b981 : 0x1e293b);
        marker.scale.setScalar(isSelected ? 1.4 : 1.0);
        ringMat.color.setHex(isSelected ? 0x10b981 : 0x64748b);
        ringMat.opacity = isSelected ? 1.0 : 0.6;
        ring.scale.setScalar(isSelected ? 1.4 : 1.0);
      });
    };

    let isTargeting = false;
    let targetRotX = 0;
    let targetRotY = 0;

    const setTargetRotation = (dc: Datacenter | null) => {
      if (!dc) {
        isTargeting = false;
        return;
      }
      targetRotY = -((dc.lng + 90) * (Math.PI / 180));
      targetRotX = dc.lat * (Math.PI / 180) * 0.35;
      isTargeting = true;
      autoRotate = false;
      velX = 0;
      velY = 0;
      if (autoRotateResumeTimeout) {
        clearTimeout(autoRotateResumeTimeout);
        autoRotateResumeTimeout = null;
      }
    };

    sceneControlsRef.current = {
      updateUserMarker,
      setTargetRotation,
      updateNodeHighlights,
    };

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let velX = 0;
    let velY = 0;
    let autoRotate = true;
    let autoRotateResumeTimeout: ReturnType<typeof setTimeout> | null = null;

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      autoRotate = false;
      isTargeting = false;
      velX = 0;
      velY = 0;
      startX = e.clientX;
      startY = e.clientY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
      if (autoRotateResumeTimeout) {
        clearTimeout(autoRotateResumeTimeout);
        autoRotateResumeTimeout = null;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / containerW) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / containerH) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(clickTargets);
        renderer.domElement.style.cursor = intersects.length > 0 ? "pointer" : "grab";
        return;
      }

      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      velX = deltaX * 0.005;
      velY = deltaY * 0.005;
      globeGroup.rotation.y += velX;
      globeGroup.rotation.x = Math.max(-0.6, Math.min(0.6, globeGroup.rotation.x + velY));
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isDragging) return;
      isDragging = false;
      renderer.domElement.style.cursor = "grab";

      const diffX = Math.abs(e.clientX - startX);
      const diffY = Math.abs(e.clientY - startY);

      if (diffX < 6 && diffY < 6) {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / containerW) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / containerH) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(clickTargets);
        if (intersects.length > 0) {
          const hitDc = intersects[0].object.userData.datacenter as Datacenter;
          selectDatacenter(hitDc);
        } else {
          setSelectedDc(null);
          setPing(null);
        }
      }

      autoRotateResumeTimeout = setTimeout(() => {
        autoRotate = true;
      }, 3200);
    };

    const onDocumentPointerDown = (e: PointerEvent) => {
      if (container && !container.contains(e.target as Node)) {
        setSelectedDc(null);
        setPing(null);
      }
    };

    const dom = renderer.domElement;
    dom.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointerdown", onDocumentPointerDown);

    const _calloutPos = new THREE.Vector3();
    const updateCalloutPosition = () => {
      const activeDc = currentSelectedDcRef.current;
      if (!calloutRef.current || !activeDc) {
        if (calloutRef.current) calloutRef.current.style.opacity = "0";
        return;
      }
      _calloutPos.copy(latLngToVector3(activeDc.lat, activeDc.lng, globeRadius + 3.0));
      _calloutPos.applyMatrix4(globeGroup.matrixWorld);

      if (_calloutPos.z > -15) {
        _calloutPos.project(camera);
        const screenX = ((_calloutPos.x + 1) * containerW) * 0.5;
        const screenY = ((-_calloutPos.y + 1) * containerH) * 0.5;
        calloutRef.current.style.transform = `translate3d(${screenX.toFixed(1)}px, ${screenY.toFixed(1)}px, 0) translate(-50%, -145%)`;
        calloutRef.current.style.opacity = "1";
      } else {
        calloutRef.current.style.opacity = "0";
      }
    };

    const _labelPos = new THREE.Vector3();
    const _userPos = new THREE.Vector3();

    const updateLabels = () => {
      const halfW = containerW * 0.5;
      const halfH = containerH * 0.5;

      for (let i = 0; i < dcPositions.length; i++) {
        const item = dcPositions[i];
        const el = labelRefs.current[item.dc.id];
        if (!el) continue;

        _labelPos.copy(item.pos).applyMatrix4(globeGroup.matrixWorld);
        if (_labelPos.z > -2) {
          _labelPos.project(camera);
          const screenX = _labelPos.x * halfW + halfW;
          const screenY = -_labelPos.y * halfH + halfH;
          const depthAlpha = _labelPos.z > 8 ? 1 : Math.max(0, (_labelPos.z + 2) / 10);

          el.style.transform = `translate3d(${screenX.toFixed(1)}px, ${screenY.toFixed(1)}px, 0) translate(-50%, 9px)`;
          el.style.opacity = depthAlpha.toFixed(2);
          el.style.pointerEvents = depthAlpha > 0.4 ? "auto" : "none";
        } else {
          el.style.opacity = "0";
          el.style.pointerEvents = "none";
        }
      }

      const curUserLoc = currentUserLocationRef.current;
      if (curUserLoc && userLabelRef.current) {
        _userPos.copy(latLngToVector3(curUserLoc.lat, curUserLoc.lng, globeRadius + 1.2));
        _userPos.applyMatrix4(globeGroup.matrixWorld);
        if (_userPos.z > -2) {
          _userPos.project(camera);
          const screenX = _userPos.x * halfW + halfW;
          const screenY = -_userPos.y * halfH + halfH;
          const depthAlpha = _userPos.z > 8 ? 1 : Math.max(0, (_userPos.z + 2) / 10);

          userLabelRef.current.style.transform = `translate3d(${screenX.toFixed(1)}px, ${screenY.toFixed(1)}px, 0) translate(-50%, 9px)`;
          userLabelRef.current.style.opacity = depthAlpha.toFixed(2);
        } else {
          userLabelRef.current.style.opacity = "0";
        }
      }
    };

    const clock = new THREE.Clock();
    let animId: number;

    const animate = () => {
      animId = requestAnimationFrame(animate);

      const delta = Math.min(clock.getDelta(), 0.05);

      atmoMesh.lookAt(camera.position);

      if (isDragging) {
      } else if (isTargeting) {
        let diffY = (targetRotY - globeGroup.rotation.y) % (Math.PI * 2);
        if (diffY > Math.PI) diffY -= Math.PI * 2;
        if (diffY < -Math.PI) diffY += Math.PI * 2;

        const step = Math.min(1, delta * 5.0);
        globeGroup.rotation.y += diffY * step;
        globeGroup.rotation.x += (targetRotX - globeGroup.rotation.x) * step;

        if (Math.abs(diffY) < 0.001 && Math.abs(targetRotX - globeGroup.rotation.x) < 0.001) {
          isTargeting = false;
          autoRotateResumeTimeout = setTimeout(() => {
            autoRotate = true;
          }, 3500);
        }
      } else if (Math.abs(velX) > 0.0001 || Math.abs(velY) > 0.0001) {
        globeGroup.rotation.y += velX;
        globeGroup.rotation.x = Math.max(-0.6, Math.min(0.6, globeGroup.rotation.x + velY));
        const friction = Math.pow(0.04, delta);
        velX *= friction;
        velY *= friction;
      } else if (autoRotate) {
        globeGroup.rotation.y += delta * 0.14;
        globeGroup.rotation.x += (0 - globeGroup.rotation.x) * (delta * 1.2);
      }

      updateCalloutPosition();
      updateLabels();

      renderer.render(scene, camera);
    };
    animate();

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newWidth = Math.round(entry.contentRect.width);
        const newHeight = Math.round(entry.contentRect.height);
        if (newWidth > 0 && newHeight > 0 && (newWidth !== containerW || newHeight !== containerH)) {
          containerW = newWidth;
          containerH = newHeight;
          camera.aspect = newWidth / newHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(newWidth, newHeight);
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      if (autoRotateResumeTimeout) clearTimeout(autoRotateResumeTimeout);

      dom.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointerdown", onDocumentPointerDown);

      if (container.contains(dom)) {
        container.removeChild(dom);
      }
      scene.remove(atmoMesh);
      atmoGeo.dispose();
      atmoMat.dispose();
      renderer.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      sphereGeometry.dispose();
      wireframeMaterial.dispose();
      equatorGeo.dispose();
      equatorMat.dispose();
      dotGeo.dispose();
      dotMat.dispose();
      if (userMarkerGeo) userMarkerGeo.dispose();
      if (userMarkerMat) userMarkerMat.dispose();
      if (userRingGeo) userRingGeo.dispose();
      if (userRingMat) userRingMat.dispose();
      sceneControlsRef.current = null;
    };
  }, [selectDatacenter]);

  useEffect(() => {
    currentSelectedDcRef.current = selectedDc;
    currentUserLocationRef.current = userLocation;

    if (sceneControlsRef.current) {
      sceneControlsRef.current.updateUserMarker(userLocation);
      sceneControlsRef.current.setTargetRotation(selectedDc);
      sceneControlsRef.current.updateNodeHighlights(selectedDc?.id ?? null);
    }
  }, [selectedDc, userLocation]);

  return (
    <div className="pure-globe-container">
      <div className="pure-globe-canvas" ref={mountRef}>
        {DATACENTERS.map((dc) => (
          <div
            key={dc.id}
            ref={(el) => {
              labelRefs.current[dc.id] = el;
            }}
            className={`globe-node-label ${selectedDc?.id === dc.id ? "selected" : ""}`}
            style={{ opacity: 0, transform: "translate3d(-9999px, -9999px, 0)" }}
            onClick={(e) => {
              e.stopPropagation();
              selectDatacenter(dc);
            }}
          >
            <span className="node-label-flag">{dc.flag}</span>
            <span>{dc.city}</span>
          </div>
        ))}

        {userLocation && (
          <div
            ref={userLabelRef}
            className="globe-node-label user-location-badge"
            style={{ opacity: 0, transform: "translate3d(-9999px, -9999px, 0)" }}
          >
            <span className="node-label-flag">📍</span>
            <span>
              {userLocation.isp
                ? `You (${userLocation.isp})`
                : userLocation.city
                  ? `You (${userLocation.city})`
                  : "You"}
            </span>
          </div>
        )}

        <div
          ref={calloutRef}
          className="globe-node-callout"
          style={{ opacity: 0, pointerEvents: "none" }}
        >
          {selectedDc && (
            <>
              <span className="node-callout-flag">{selectedDc.flag}</span>
              <span className="node-callout-city">{selectedDc.city}</span>
              <span className="node-callout-dot">•</span>
              <span className="node-callout-ping">
                <span className="node-ping-indicator" />
                {isPinging ? "pinging..." : `${ping ?? selectedDc.fallbackPing} ms`}
              </span>
              <span className="node-callout-dot">•</span>
              <span className="node-callout-isp">
                {userLocation?.isp
                  ? `from ${userLocation.isp}`
                  : userLocation?.city
                    ? `from ${userLocation.city}`
                    : "from your ISP"}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default LatencyGlobe;
