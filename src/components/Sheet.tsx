import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useAnimationControls, useDragControls, type PanInfo } from 'motion/react';
import { m, springSheet } from '../motion';

interface Props {
  open: boolean;
  onOpenChange(open: boolean): void;
  enabled: boolean; // false (layar lebar): panel samping biasa, tanpa seret
  label: string;
  children: ReactNode;
}

const HANDLE = 56; // tinggi bagian yang tetap terlihat saat tertutup
const FLICK = 450; // px/detik: lebih cepat dari ini dianggap lemparan, bukan lepas biasa

/**
 * Panel samping di layar lebar; di layar sempit menjadi bottom sheet yang bisa diseret lewat gagangnya
 * (isi panel tetap bisa digulir). Dilepas: arah lemparan menentukan, bila pelan tergantung lewat atau
 * belum setengah jalan. Posisi tutup diukur dari tinggi panel, jadi ikut berubah saat isinya berubah.
 */
export function Sheet({ open, onOpenChange, enabled, label, children }: Props) {
  const ref = useRef<HTMLElement>(null);
  const [closedY, setClosedY] = useState(0);
  const controls = useAnimationControls();
  const dragControls = useDragControls();
  const dragged = useRef(false);
  const mounted = useRef(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!enabled || !el) { setClosedY(0); return; }
    const measure = () => setClosedY(Math.max(0, el.offsetHeight - HANDLE));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [enabled]);

  const target = enabled && !open ? closedY : 0;
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; controls.set({ y: target }); return; }
    controls.start({ y: target, transition: springSheet });
  }, [controls, target]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const y = (open ? 0 : closedY) + info.offset.y;
    const next = Math.abs(info.velocity.y) > FLICK ? info.velocity.y < 0 : y < closedY / 2;
    controls.start({ y: next ? 0 : closedY, transition: springSheet }); // kembali ke posisi bila keadaan tidak berubah
    if (next !== open) onOpenChange(next);
  };

  return (
    <m.aside
      ref={ref} className="panel" aria-label={label} layoutScroll
      animate={controls} drag={enabled ? 'y' : false} dragListener={false} dragControls={dragControls}
      dragConstraints={{ top: 0, bottom: closedY }} dragElastic={{ top: 0.05, bottom: 0.15 }} dragMomentum={false}
      onDragStart={() => { dragged.current = true; }} onDragEnd={onDragEnd}
    >
      <button
        className="grab" aria-expanded={open} aria-label={label}
        onPointerDown={(e) => { dragged.current = false; if (enabled) dragControls.start(e); }}
        onClick={() => { if (!dragged.current) onOpenChange(!open); }}
      >
        <span />
      </button>
      {children}
    </m.aside>
  );
}
