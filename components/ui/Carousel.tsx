'use client';
import { Children, useCallback, useEffect, useRef, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { twMerge } from 'tailwind-merge';

const MEDIA = { md: '(min-width: 768px)', lg: '(min-width: 1024px)' } as const;
const SEMBUNYI_TITIK = { md: 'md:hidden', lg: 'lg:hidden' } as const;

export function TitikCarousel({ jumlah, aktif, onPilih, className }: {
  jumlah: number; aktif: number; onPilih: (i: number) => void; className?: string;
}) {
  if (jumlah < 2) return null;
  return (
    <div className={twMerge('flex justify-center gap-0.5 pt-1', className)}>
      {Array.from({ length: jumlah }, (_, i) => (
        <button key={i} type="button" onClick={() => onPilih(i)} aria-label={`Slide ${i + 1} dari ${jumlah}`}
          aria-current={i === aktif ? 'true' : undefined} className="group p-1.5">
          <span className={twMerge('block h-1.5 rounded-full transition-all duration-300',
            i === aktif ? 'w-4 bg-bq-biru' : 'w-1.5 bg-bq-biru/30 group-hover:bg-bq-biru/60')} />
        </button>
      ))}
    </div>
  );
}

/**
 * Carousel geser ber-dots (Embla). `nonaktifMulai` mematikan carousel mulai breakpoint
 * itu — anak-anak lalu ditata oleh `wadahClassName` (mis. "md:grid md:grid-cols-4").
 */
export function Carousel({ label, children, className, wadahClassName, slideClassName, nonaktifMulai, onPilih }: {
  label: string; children: React.ReactNode; className?: string; wadahClassName?: string; slideClassName?: string;
  nonaktifMulai?: keyof typeof MEDIA; onPilih?: (indeks: number) => void;
}) {
  const [viewportRef, api] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    breakpoints: nonaktifMulai ? { [MEDIA[nonaktifMulai]]: { active: false } } : {},
  });
  const [aktif, setAktif] = useState(0);
  const [jumlah, setJumlah] = useState(0);
  const onPilihRef = useRef(onPilih);
  onPilihRef.current = onPilih;
  const slides = Children.toArray(children);

  const sinkron = useCallback(() => {
    if (!api) return;
    setJumlah(api.scrollSnapList().length);
    const i = api.selectedScrollSnap();
    setAktif(i);
    onPilihRef.current?.(i);
  }, [api]);

  useEffect(() => {
    if (!api) return;
    sinkron();
    api.on('select', sinkron).on('reInit', sinkron);
    return () => { api.off('select', sinkron).off('reInit', sinkron); };
  }, [api, sinkron]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); api?.scrollNext(); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); api?.scrollPrev(); }
  };

  return (
    <section aria-roledescription="carousel" aria-label={label} className={className}>
      <div ref={viewportRef} className="-m-2 overflow-hidden p-2" tabIndex={0} onKeyDown={onKeyDown}>
        <div className={twMerge('flex gap-3', wadahClassName)}>
          {slides.map((s, i) => (
            <div key={i} role="group" aria-roledescription="slide" aria-label={`${i + 1} dari ${slides.length}`}
              className={twMerge('min-w-0 shrink-0 grow-0 basis-[78%]', slideClassName)}>
              {s}
            </div>
          ))}
        </div>
      </div>
      <TitikCarousel jumlah={jumlah} aktif={aktif} onPilih={(i) => api?.scrollTo(i)}
        className={nonaktifMulai ? SEMBUNYI_TITIK[nonaktifMulai] : undefined} />
    </section>
  );
}
