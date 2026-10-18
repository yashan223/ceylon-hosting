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

        const loc = overrideLocation ?? userLocation;
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
        const loc = overrideLocation ?? userLocation;
        const originLat = loc?.lat ?? 6.9271;
        const originLng = loc?.lng ?? 79.8612;
        const distKm = getDistanceKm(originLat, originLng, dc.lat, dc.lng);
        const fallbackCalculated = Math.round(distKm * 0.016 + 10);
        setPing(Math.max(10, fallbackCalculated));
      } finally {
        setIsPinging(false);
      }
    },
    [userLocation],
  );

  const selectDatacenter = useCallback(
    (dc: Datacenter) => {
      selectedDcRef.current = dc;
      setSelectedDc(dc);
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
          };
          setUserLocation(loc);
          if (selectedDcRef.current) {
            measurePing(selectedDcRef.current, loc);
          }
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
          };
          setUserLocation(loc);
          if (selectedDcRef.current) {
            measurePing(selectedDcRef.current, loc);
          }
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
            setUserLocation(loc);
            if (selectedDcRef.current) {
              measurePing(selectedDcRef.current, loc);
            }
            return;
          }
        }
      } catch {}
    }

    detectUserLocation();

    return () => {
      isMounted = false;
    };
  }, [measurePing]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 440;
    const height = container.clientHeight || 420;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 200;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
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
      const x = r * sinPhi * Math.cos(theta);
      const y = r * Math.cos(phi);
      const z = r * sinPhi * Math.sin(theta);

      particlePositions[i * 3] = x;
      particlePositions[i * 3 + 1] = y;
      particlePositions[i * 3 + 2] = z;
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

    if (userLocation) {
      const uPos = latLngToVector3(userLocation.lat, userLocation.lng, globeRadius + 1.2);
      userMarkerGeo = new THREE.SphereGeometry(3.6, 16, 16);
      userMarkerMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 });
      userNodeMesh = new THREE.Mesh(userMarkerGeo, userMarkerMat);
      userNodeMesh.position.copy(uPos);
      globeGroup.add(userNodeMesh);

      userRingGeo = new THREE.RingGeometry(4.2, 6.2, 24);
      userRingMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
      });
      userRingMesh = new THREE.Mesh(userRingGeo, userRingMat);
      userRingMesh.position.copy(uPos);
      userRingMesh.lookAt(new THREE.Vector3(0, 0, 0));
      globeGroup.add(userRingMesh);
    }

    const clickTargets: THREE.Mesh[] = [];

    DATACENTERS.forEach((dc) => {
      const pos = latLngToVector3(dc.lat, dc.lng, globeRadius + 1.2);
      const isSelected = selectedDc?.id === dc.id;

      const markerGeo = new THREE.SphereGeometry(isSelected ? 4.0 : 2.8, 16, 16);
      const markerMat = new THREE.MeshBasicMaterial({
        color: isSelected ? 0x10b981 : 0x1e293b,
      });
      const marker = new THREE.Mesh(markerGeo, markerMat);
      marker.position.copy(pos);
      globeGroup.add(marker);

      const nodeRingGeo = new THREE.RingGeometry(
        isSelected ? 4.5 : 3.4,
        isSelected ? 7.2 : 5.0,
        24,
      );
      const nodeRingMat = new THREE.MeshBasicMaterial({
        color: isSelected ? 0x10b981 : 0x64748b,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: isSelected ? 1.0 : 0.6,
      });
      const nodeRing = new THREE.Mesh(nodeRingGeo, nodeRingMat);
      nodeRing.position.copy(pos);
      nodeRing.lookAt(new THREE.Vector3(0, 0, 0));
      globeGroup.add(nodeRing);

      const hitGeo = new THREE.SphereGeometry(12.0, 10, 10);
      const hitMat = new THREE.MeshBasicMaterial({ visible: false });
      const hitMesh = new THREE.Mesh(hitGeo, hitMat);
      hitMesh.position.copy(pos);
      hitMesh.userData = { datacenter: dc };
      globeGroup.add(hitMesh);
      clickTargets.push(hitMesh);
    });

    let arcLine: THREE.Line | null = null;
    let tracerMesh: THREE.Mesh | null = null;
    let tracerCurve: THREE.QuadraticBezierCurve3 | null = null;
    let tracerT = 0;

    const effectiveOrigin = userLocation ?? { lat: 6.9271, lng: 79.8612 };

    if (selectedDc) {
      const p1 = latLngToVector3(effectiveOrigin.lat, effectiveOrigin.lng, globeRadius + 1.5);
      const p2 = latLngToVector3(selectedDc.lat, selectedDc.lng, globeRadius + 1.5);

      const distance = p1.distanceTo(p2);
      if (distance > 3) {
        const mid = p1.clone().add(p2).multiplyScalar(0.5);
        mid.normalize().multiplyScalar(globeRadius + Math.max(14, distance * 0.32));

        const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2);
        tracerCurve = curve;
        const points = curve.getPoints(50);
        const arcGeo = new THREE.BufferGeometry().setFromPoints(points);
        const arcMat = new THREE.LineBasicMaterial({
          color: 0x10b981,
          transparent: true,
          opacity: 0.95,
        });
        arcLine = new THREE.Line(arcGeo, arcMat);
        globeGroup.add(arcLine);

        const tracerGeo = new THREE.SphereGeometry(2.4, 12, 12);
        const tracerMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
        tracerMesh = new THREE.Mesh(tracerGeo, tracerMat);
        globeGroup.add(tracerMesh);
      }
    }

    if (selectedDc) {
      const targetRotY = -((selectedDc.lng + 90) * (Math.PI / 180));
      const targetRotX = selectedDc.lat * (Math.PI / 180) * 0.35;
      globeGroup.rotation.y = targetRotY;
      globeGroup.rotation.x = targetRotX;
    }

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let autoRotate = true;

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      autoRotate = false;
      startX = e.clientX;
      startY = e.clientY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(clickTargets);
      if (intersects.length > 0) {
        renderer.domElement.style.cursor = "pointer";
      } else {
        renderer.domElement.style.cursor = isDragging ? "grabbing" : "grab";
      }

      if (!isDragging) return;
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      globeGroup.rotation.y += deltaX * 0.007;
      globeGroup.rotation.x += deltaY * 0.007;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onPointerUp = (e: PointerEvent) => {
      isDragging = false;
      const diffX = Math.abs(e.clientX - startX);
      const diffY = Math.abs(e.clientY - startY);

      if (diffX < 6 && diffY < 6) {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
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

      setTimeout(() => {
        autoRotate = true;
      }, 4000);
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

    const updateCalloutPosition = () => {
      if (!calloutRef.current || !container || !selectedDc) {
        if (calloutRef.current) calloutRef.current.style.opacity = "0";
        return;
      }
      const pos = latLngToVector3(selectedDc.lat, selectedDc.lng, globeRadius + 3.0);
      pos.applyMatrix4(globeGroup.matrixWorld);

      if (pos.z > -15) {
        const projected = pos.clone().project(camera);
        const rect = container.getBoundingClientRect();
        const screenX = ((projected.x + 1) * rect.width) / 2;
        const screenY = ((-projected.y + 1) * rect.height) / 2;
        calloutRef.current.style.transform = `translate3d(calc(${screenX}px - 50%), calc(${screenY}px - 145%), 0)`;
        calloutRef.current.style.opacity = "1";
      } else {
        calloutRef.current.style.opacity = "0";
      }
    };

    const updateLabels = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      const halfW = w / 2;
      const halfH = h / 2;

      for (let i = 0; i < dcPositions.length; i++) {
        const item = dcPositions[i];
        const el = labelRefs.current[item.dc.id];
        if (!el) continue;

        const worldPos = item.pos.clone().applyMatrix4(globeGroup.matrixWorld);
        if (worldPos.z > -2) {
          const projected = worldPos.project(camera);
          const screenX = projected.x * halfW + halfW;
          const screenY = -projected.y * halfH + halfH;
          const depthAlpha = worldPos.z > 8 ? 1 : Math.max(0, (worldPos.z + 2) / 10);

          el.style.transform = `translate3d(calc(${screenX}px - 50%), calc(${screenY}px + 9px), 0)`;
          el.style.opacity = `${depthAlpha}`;
          el.style.pointerEvents = depthAlpha > 0.4 ? "auto" : "none";
        } else {
          el.style.opacity = "0";
          el.style.pointerEvents = "none";
        }
      }

      if (userLocation && userLabelRef.current) {
        const uPos = latLngToVector3(userLocation.lat, userLocation.lng, globeRadius + 1.2);
        const worldPos = uPos.applyMatrix4(globeGroup.matrixWorld);
        if (worldPos.z > -2) {
          const projected = worldPos.project(camera);
          const screenX = projected.x * halfW + halfW;
          const screenY = -projected.y * halfH + halfH;
          const depthAlpha = worldPos.z > 8 ? 1 : Math.max(0, (worldPos.z + 2) / 10);

          userLabelRef.current.style.transform = `translate3d(calc(${screenX}px - 50%), calc(${screenY}px + 9px), 0)`;
          userLabelRef.current.style.opacity = `${depthAlpha}`;
        } else {
          userLabelRef.current.style.opacity = "0";
        }
      }
    };

    let animId: number;

    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (tracerMesh && tracerCurve) {
        tracerT = (tracerT + 0.018) % 1.0;
        tracerMesh.position.copy(tracerCurve.getPoint(tracerT));
      }

      atmoMesh.lookAt(camera.position);

      if (autoRotate && !isDragging) {
        globeGroup.rotation.y += 0.002;
      }

      updateCalloutPosition();
      updateLabels();

      renderer.render(scene, camera);
    };
    animate();

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newWidth = entry.contentRect.width;
        const newHeight = entry.contentRect.height;
        if (newWidth > 0 && newHeight > 0) {
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
      if (arcLine) arcLine.geometry.dispose();
      if (tracerMesh) {
        tracerMesh.geometry.dispose();
        (tracerMesh.material as THREE.Material).dispose();
      }
    };
  }, [selectedDc, selectDatacenter, userLocation]);

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
            <span>{userLocation.city ? `You (${userLocation.city})` : "You"}</span>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default LatencyGlobe;
