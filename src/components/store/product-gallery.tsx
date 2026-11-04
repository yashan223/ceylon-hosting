"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
  Camera,
  PackageCheck,
  Server,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/product";

type ProductGalleryProps = {
  product: Product;
};

export function ProductGallery({ product }: ProductGalleryProps) {
  const images =
    product.images && product.images.length > 0
      ? product.images
      : product.imageUrl
        ? [product.imageUrl]
        : [];

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const isService = product.type === "service";
  const hasMultiple = images.length > 1;

  const handleNext = useCallback(() => {
    if (images.length === 0) return;
    setSelectedIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const handlePrev = useCallback(() => {
    if (images.length === 0) return;
    setSelectedIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  useEffect(() => {
    if (!lightboxOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setLightboxOpen(false);
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxOpen, handleNext, handlePrev]);

  if (images.length === 0) {
    return (
      <div className={cn("product-detail-visual", `product-art-${product.accent}`)}>
        <div className="product-art-symbol">
          {product.type === "server" ? (
            <Server size={78} strokeWidth={1.2} />
          ) : isService ? (
            <Wrench size={78} strokeWidth={1.2} />
          ) : (
            <PackageCheck size={78} strokeWidth={1.2} />
          )}
        </div>
        <span className="product-art-label">
          {product.type === "server" ? "SERVER" : isService ? "SERVICE" : "MOD PACK"}
        </span>
      </div>
    );
  }

  const activeImage = images[selectedIndex] ?? images[0];

  return (
    <div className="product-gallery-container">
      <div
        className={cn(
          "product-detail-visual",
          `product-art-${product.accent}`,
          "has-image",
          "product-gallery-stage",
        )}
        onClick={() => setLightboxOpen(true)}
      >
        <Image
          src={activeImage}
          alt={`${product.name} - view ${selectedIndex + 1}`}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="product-detail-image"
          priority
          style={{ objectFit: "cover" }}
        />

        <span className="product-art-label">
          {product.type === "server" ? "SERVER" : isService ? "SERVICE" : "MOD PACK"}
        </span>

        {hasMultiple && (
          <div className="product-gallery-counter">
            <Camera size={13} />
            <span>
              {selectedIndex + 1} / {images.length}
            </span>
          </div>
        )}

        <button
          type="button"
          className="product-gallery-expand-btn"
          aria-label="View full size image"
          onClick={(e) => {
            e.stopPropagation();
            setLightboxOpen(true);
          }}
        >
          <Maximize2 size={15} />
        </button>

        {hasMultiple && (
          <>
            <button
              type="button"
              className="product-gallery-nav-btn prev"
              aria-label="Previous screenshot"
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              className="product-gallery-nav-btn next"
              aria-label="Next screenshot"
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}
      </div>

      {hasMultiple && (
        <div className="product-gallery-thumbnails" role="tablist" aria-label="Screenshots">
          {images.map((imgUrl, index) => {
            const isActive = index === selectedIndex;
            return (
              <button
                type="button"
                key={imgUrl + index}
                role="tab"
                aria-selected={isActive}
                className={cn("product-gallery-thumb", isActive && "active")}
                onClick={() => setSelectedIndex(index)}
              >
                <Image
                  src={imgUrl}
                  alt={`Screenshot thumbnail ${index + 1}`}
                  fill
                  sizes="80px"
                  style={{ objectFit: "cover" }}
                />
              </button>
            );
          })}
        </div>
      )}

      {lightboxOpen && (
        <div
          className="product-lightbox-overlay"
          onClick={() => setLightboxOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="product-lightbox-close"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close image preview"
          >
            <X size={22} />
          </button>

          <div className="product-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <div className="product-lightbox-image-wrap">
              <Image
                src={activeImage}
                alt={`${product.name} - large preview ${selectedIndex + 1}`}
                width={1280}
                height={720}
                className="product-lightbox-img"
                style={{ objectFit: "contain", maxHeight: "80vh", width: "auto" }}
                priority
              />
            </div>

            {hasMultiple && (
              <>
                <button
                  type="button"
                  className="product-lightbox-nav prev"
                  onClick={handlePrev}
                  aria-label="Previous"
                >
                  <ChevronLeft size={28} />
                </button>
                <button
                  type="button"
                  className="product-lightbox-nav next"
                  onClick={handleNext}
                  aria-label="Next"
                >
                  <ChevronRight size={28} />
                </button>

                <div className="product-lightbox-footer">
                  <span>
                    Screenshot {selectedIndex + 1} of {images.length}
                  </span>
                  <div className="product-lightbox-thumbs">
                    {images.map((imgUrl, idx) => (
                      <button
                        type="button"
                        key={imgUrl + idx}
                        className={cn("product-lightbox-thumb", idx === selectedIndex && "active")}
                        onClick={() => setSelectedIndex(idx)}
                      >
                        <Image
                          src={imgUrl}
                          alt={`Thumbnail ${idx + 1}`}
                          width={64}
                          height={36}
                          style={{ objectFit: "cover" }}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
