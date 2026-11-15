import { useEffect, useMemo, useRef, useState } from "react";
import { cardText, type Person } from "../content/team";
import { finePointer, reducedMotion } from "../lib/media";
import { contactRows, qrPath, vcard } from "./contact";
import s from "./TeamCard.module.css";

/** Наибольший наклон карты к курсору/пальцу, градусы. */
const MAX_TILT = 7;
/** Доля пути до цели за кадр (60 Гц) — мягкое следование без пружинной раскачки. */
const FOLLOW = 0.14;

/**
 * Визитка — по образцу владельца: вертикальная карта. Лицо — фото во весь размер
 * (или тёмный матовый материал) и крупное имя; оборот — светлый: роль, QR
 * (vCard: камера предлагает сохранить контакт, нажатие скачивает .vcf), имя и
 * контакты — настоящие ссылки.
 *
 * Без WebGL: CSS-3D. Наклон к курсору (на телефоне — пальцем: зажал и ведёшь)
 * пишется прямо в style.transform в цикле rAF, который работает, только пока
 * карта движется. Блик — от неподвижного света: заранее нарисованное пятно,
 * которое лишь сдвигается (transform) и меняет яркость (opacity). Тень —
 * размытие нарисовано один раз (::before), двигается слой целиком.
 * Переворот — CSS-переход rotateY без перелёта.
 */
export function TeamCard({ person }: { person: Person }) {
  const hitRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const specRefs = useRef<HTMLDivElement[]>([]);
  const shadowRef = useRef<HTMLDivElement>(null);
  const [flipped, setFlipped] = useState(false);
  const rows = useMemo(() => contactRows(person), [person]);
  const qr = useMemo(() => qrPath(vcard(person)), [person]);
  const [vcf, setVcf] = useState("");

  useEffect(() => {
    const url = URL.createObjectURL(new Blob([vcard(person)], { type: "text/vcard;charset=utf-8" }));
    setVcf(url);
    return () => URL.revokeObjectURL(url);
  }, [person]);

  // ---------- наклон ----------
  const motion = useRef({ x: 0, y: 0, tx: 0, ty: 0, raf: 0 });
  const dragged = useRef(false);
  useEffect(() => {
    const hit = hitRef.current!;
    const M = motion.current;
    const hover = finePointer() && !reducedMotion();
    const touch = !reducedMotion();
    let drag: { x: number; y: number } | null = null;

    const frame = () => {
      M.x += (M.tx - M.x) * FOLLOW;
      M.y += (M.ty - M.y) * FOLLOW;
      const rx = -M.y * MAX_TILT * 2, ry = M.x * MAX_TILT * 2;
      tiltRef.current!.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
      // свет сверху-слева: блик уходит против наклона и ярчеет, когда карта повёрнута к свету
      const toLight = Math.max(0, -M.x - M.y);
      for (const sp of specRefs.current) {
        sp.style.transform = `translate3d(${(-M.x * 40).toFixed(1)}%, ${(-M.y * 40).toFixed(1)}%, 0)`;
        sp.style.opacity = (0.35 + toLight * 0.9).toFixed(3);
      }
      shadowRef.current!.style.transform = `translate3d(${(-M.x * 18).toFixed(1)}px, ${(-M.y * 12).toFixed(1)}px, 0)`;
      const still = Math.abs(M.tx - M.x) < 0.001 && Math.abs(M.ty - M.y) < 0.001;
      M.raf = still ? 0 : requestAnimationFrame(frame);
    };
    const aim = (x: number, y: number) => {
      M.tx = x; M.ty = y;
      if (!M.raf) M.raf = requestAnimationFrame(frame);
    };
    const at = (e: PointerEvent) => {
      const r = hit.getBoundingClientRect();
      const k = (v: number) => Math.min(1, Math.max(0, v)) - 0.5;
      aim(k((e.clientX - r.left) / r.width), k((e.clientY - r.top) / r.height));
    };
    const down = (e: PointerEvent) => {
      dragged.current = false;
      if (e.pointerType === "touch" && touch) { drag = { x: e.clientX, y: e.clientY }; at(e); }
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "touch") { if (hover) at(e); return; }
      if (!drag) return;
      if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 10) dragged.current = true;
      at(e);
    };
    const up = (e: PointerEvent) => { if (e.pointerType === "touch") { drag = null; aim(0, 0); } };
    const leave = (e: PointerEvent) => { if (e.pointerType !== "touch") aim(0, 0); };
    hit.addEventListener("pointerdown", down);
    hit.addEventListener("pointermove", move);
    hit.addEventListener("pointerup", up);
    hit.addEventListener("pointercancel", up);
    hit.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(M.raf); M.raf = 0;
      hit.removeEventListener("pointerdown", down);
      hit.removeEventListener("pointermove", move);
      hit.removeEventListener("pointerup", up);
      hit.removeEventListener("pointercancel", up);
      hit.removeEventListener("pointerleave", leave);
    };
  }, []);

  const flip = () => { if (dragged.current) { dragged.current = false; return; } setFlipped(v => !v); };
  const backText = [cardText.title, ...rows.map(r => `${r.label}: ${r.value}`)].join(". ");

  return (
    <div className={s.deal}>
      <div ref={shadowRef} className={s.shadow} aria-hidden="true" />
      <div
        ref={hitRef} className={s.hit}
        role="button" tabIndex={0} aria-pressed={flipped} aria-label={cardText.label(person)}
        onClick={flip}
        onKeyDown={e => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setFlipped(v => !v); } }}
      >
        <div ref={tiltRef} className={s.tilt}>
          <div className={`${s.flip} ${flipped ? s.flipped : ""}`}>
            {/* лицо */}
            <div className={`${s.side} ${s.front}`} inert={flipped}>
              {person.photo && <img className={s.photo} src={person.photo} alt="" decoding="async" />}
              <div className={s.name}><p>{person.name}</p><p>{person.surname}</p></div>
              <div className={s.gloss} aria-hidden="true"><div ref={el => { if (el) specRefs.current[0] = el; }} className={s.spec} /></div>
            </div>
            {/* оборот */}
            <div className={`${s.side} ${s.back}`} inert={!flipped}>
              <div className={s.role}>{cardText.roleLines(person).map(l => <p key={l}>{l}</p>)}</div>
              <a
                className={s.qr} href={vcf} download={`${person.slug}.vcf`} aria-label={cardText.save}
                onClick={e => e.stopPropagation()}
              >
                <svg viewBox={`0 0 ${qr.n} ${qr.n}`} shapeRendering="crispEdges" aria-hidden="true"><path d={qr.d} /></svg>
              </a>
              <div className={s.foot}>
                <p className={s.fullName}>{person.name} {person.surname}</p>
                <div className={s.list}>
                  {rows.map(r => (
                    <a
                      key={r.label} className={s.row} href={r.href} aria-label={`${r.label}: ${r.value}`}
                      {...(/^https?:/.test(r.href) ? { target: "_blank", rel: "noreferrer" } : {})}
                      onClick={e => e.stopPropagation()}
                    >{r.value}</a>
                  ))}
                </div>
              </div>
              <div className={s.gloss} aria-hidden="true"><div ref={el => { if (el) specRefs.current[1] = el; }} className={s.spec} /></div>
            </div>
          </div>
        </div>
        <span className={s.srOnly} aria-live="polite">{flipped ? backText : ""}</span>
      </div>
    </div>
  );
}
