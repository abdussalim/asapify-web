import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, useReducedMotionConfig, useSpring } from 'motion/react';
import { exitFast, m } from '../motion';

interface Props {
  open: boolean;
  id: string;
  /** Kotak (koordinat jendela) yang ditunjuk tooltip; dipanggil ulang saat posisi perlu dihitung. */
  anchor: () => DOMRect | null;
  /** Ganti nilainya setiap anchor pindah, supaya posisi dihitung ulang. */
  anchorKey: string | number;
  children: ReactNode;
}

const GAP = 10; // jarak ke anchor
const PAD = 8; // jarak minimum ke tepi layar
const SPRING = { stiffness: 520, damping: 38, mass: 0.75 };

/**
 * Tooltip mengambang: dirender di <body> (tidak terpotong overflow induk), muncul di atas anchor atau di
 * bawahnya bila tidak muat, dijepit ke dalam layar, dan meluncur dengan pegas saat anchor berpindah.
 * Tidak menerima pointer, jadi tidak pernah menghalangi benda yang ditunjuknya.
 */
export function FloatingTip({ open, id, anchor, anchorKey, children }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const placed = useRef(false);
  const [arrow, setArrow] = useState<{ x: number; below: boolean }>({ x: 0, below: false });
  const x = useSpring(0, SPRING);
  const y = useSpring(0, SPRING);
  const instant = useReducedMotionConfig();
  const anchorRef = useRef(anchor);
  anchorRef.current = anchor; // place tetap stabil walau anchor dibuat ulang tiap render

  const place = useCallback(() => {
    const node = el.current, a = anchorRef.current();
    if (!node || !a) return;
    const w = node.offsetWidth, h = node.offsetHeight;
    const vw = document.documentElement.clientWidth, vh = window.innerHeight;
    const cx = a.left + a.width / 2;
    const left = Math.min(Math.max(cx - w / 2, PAD), Math.max(PAD, vw - w - PAD));
    // jangan menutupi bilah atas yang menempel di layar
    const bar = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--topbar')) || 0;
    const minTop = bar + PAD;
    const roomAbove = a.top - minTop, roomBelow = vh - a.bottom - PAD;
    const below = roomAbove < h + GAP && roomBelow > roomAbove;
    const top = Math.min(Math.max(below ? a.bottom + GAP : a.top - h - GAP, minTop), Math.max(minTop, vh - h - PAD));
    if (document.documentElement.classList.contains('no-motion')) {
      // fitur gerak gagal dimuat: nilai pegas tidak dirender, jadi pasang posisi langsung
      node.style.left = `${left}px`; node.style.top = `${top}px`; node.style.transform = 'none';
    } else if (!placed.current || instant) {
      // pertama kali: langsung di tempat (tanpa terbang dari pojok); selanjutnya meluncur
      x.jump(left); y.jump(top);
    } else { x.set(left); y.set(top); }
    placed.current = true;
    setArrow((p) => (p.x === Math.round(cx - left) && p.below === below ? p : { x: Math.round(cx - left), below }));
  }, [instant, x, y]);

  useLayoutEffect(() => {
    if (!open) { placed.current = false; return; }
    place();
    const node = el.current;
    const ro = node ? new ResizeObserver(place) : null; // isi berganti ukuran
    if (node) ro?.observe(node);
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => { ro?.disconnect(); window.removeEventListener('scroll', place, true); window.removeEventListener('resize', place); };
  }, [open, anchorKey, place]);

  if (typeof document === 'undefined') return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <m.div
          key="tip" ref={el} id={id} role="tooltip" className={`tip${arrow.below ? ' below' : ''}`}
          style={{ x, y, transformOrigin: `${arrow.x}px ${arrow.below ? '0%' : '100%'}` }}
          initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1, transition: { type: 'spring', ...SPRING } }}
          exit={{ opacity: 0, scale: 0.96, transition: exitFast }}
        >
          {children}
          <i className="tip-arrow" style={{ left: arrow.x }} aria-hidden="true" />
        </m.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
