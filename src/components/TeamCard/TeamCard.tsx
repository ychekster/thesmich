import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cardText, type Person } from "../../content/team";
import { finePointer, reducedMotion } from "../../lib/media";
import { webglSupported } from "../../gl/core";
import { GlCards } from "../../gl/cards/GlCards";
import type { CardLook } from "../../gl/cards/CardsRenderer";
import { buildFace, rasterTeamCard, vcard } from "./faces";
import s from "./TeamCard.module.css";
import d from "./DomTeamCard.module.css";

/*
 * Визитка — одна большая карта ID-1 (на телефоне вертикальная) на тот же движок, что карты FAQ:
 * наклон к курсору (на телефоне — пальцем: зажал и ведёшь), блик от
 * неподвижного света, переворот по клику/тапу. Обе стороны светлые, матовые.
 * Когда открыт оборот, поверх карты лежит невидимый слой с той же разметкой
 * (LinkLayer): строки контактов — настоящие ссылки, их можно нажать. Нажатие
 * мимо ссылок переворачивает карту обратно.
 */
export const TEAM_LOOK: CardLook = {
  radius: (w, h) => 0.059 * Math.min(w, h), // скругление ID-1: 3.18 / 53.98 мм
  maxTilt: 6,
  perspective: 2800,
  shadow: (w, h) => {
    const big = Math.max(w, h);
    return { sigma: Math.max(24, big * 0.045), radius: 0.059 * Math.min(w, h) + 4, alpha: 0.85 * 0.7, k: Math.min(2.2, Math.max(1, big / 450)) };
  },
  pad: { x: 170, top: 90, bottom: 320 },
  matte: 1,
  light: true, // белая с обеих сторон: тёмная карта на чёрном фоне плохо читалась
};

interface Props {
  person: Person;
  /** Класс слота: размер карты задаёт страница. */
  slotClassName: string;
  backText: string;
}

export function TeamCard({ person, slotClassName, backText }: Props) {
  const [gl, setGl] = useState(webglSupported);
  const onFail = useCallback(() => setGl(false), []);
  const items = useMemo(() => [{ label: cardText.label(person), back: backText }], [person, backText]);
  const raster = useCallback(
    async (sizes: { w: number; h: number }[], dpr: number) => [await rasterTeamCard(person, sizes[0], dpr)],
    [person],
  );
  // раздать карту после первого кадра — чтобы появление было видно
  const [dealt, setDealt] = useState(false);
  useEffect(() => { const t = setTimeout(() => setDealt(true), 120); return () => clearTimeout(t); }, []);
  const links = useCallback((_: number, flipped: boolean) => <LinkLayer person={person} active={flipped} />, [person]);

  return gl ? (
    <GlCards items={items} raster={raster} look={TEAM_LOOK} className={d.grid} slotClassName={slotClassName}
      dealt={dealt} onFail={onFail} touchTilt renderSlot={links} />
  ) : (
    <DomTeamCard person={person} slotClassName={slotClassName} backText={backText} dealt={dealt} />
  );
}

/**
 * Невидимая копия оборота поверх карты: ссылки контактов на своих местах.
 * Активна, только пока карта повёрнута оборотом; клик по ссылке карту не
 * переворачивает. Дикторы и клавиатура тоже получают настоящие ссылки.
 */
function LinkLayer({ person, active }: { person: Person; active: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const face = buildFace(person, true);
    face.querySelectorAll("a").forEach(a => { a.className += " " + d.link; });
    // «Сохранить контакт» — файл .vcf: телефон сам предложит добавить контакт
    const url = URL.createObjectURL(new Blob([vcard(person)], { type: "text/vcard;charset=utf-8" }));
    const save = face.querySelector<HTMLAnchorElement>("a[data-save]");
    if (save) { save.href = url; save.download = `${person.slug}.vcf`; }
    ref.current!.replaceChildren(face);
    return () => URL.revokeObjectURL(url);
  }, [person]);
  return (
    <div
      ref={ref}
      className={`${s.box} ${d.links}`}
      style={{ position: "absolute", inset: 0 }} // поверх карты (у .box — relative)
      data-active={active ? "" : undefined}
      aria-hidden={!active}
      onClick={e => { if ((e.target as HTMLElement).closest("a")) e.stopPropagation(); }}
      onKeyDown={e => { if ((e.target as HTMLElement).closest("a")) e.stopPropagation(); }}
    />
  );
}

/** Без WebGL: те же растры сторон (картинки) в CSS-3D. */
function DomTeamCard({ person, slotClassName, backText, dealt }: Props & { dealt: boolean }) {
  const hitRef = useRef<HTMLDivElement>(null);
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    const hit = hitRef.current!;
    let id = 0, timer = 0;
    const draw = async () => {
      const n = ++id;
      const r = await rasterTeamCard(person, { w: hit.offsetWidth, h: hit.offsetHeight }, Math.min(devicePixelRatio || 1, 2));
      if (n !== id) return;
      frontRef.current?.replaceChildren(r.front);
      backRef.current?.replaceChildren(r.back);
    };
    const ro = new ResizeObserver(() => { clearTimeout(timer); timer = window.setTimeout(draw, 120); });
    ro.observe(hit);
    return () => { ro.disconnect(); clearTimeout(timer); id++; };
  }, [person]);

  const hover = finePointer() && !reducedMotion();
  const touchTilt = !reducedMotion();
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const dragged = useRef(false);
  const tilt = (x: number, y: number) => {
    const el = tiltRef.current;
    if (el) el.style.transform = `rotateX(${(-y * 2 * TEAM_LOOK.maxTilt).toFixed(2)}deg) rotateY(${(x * 2 * TEAM_LOOK.maxTilt).toFixed(2)}deg)`;
  };
  const tiltAt = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const k = (v: number) => Math.min(1, Math.max(0, v)) - 0.5;
    tilt(k((e.clientX - r.left) / r.width), k((e.clientY - r.top) / r.height));
  };

  return (
    <div className={`${d.grid} ${d.deal}`} data-dealt={dealt ? "" : undefined}>
      <div
        ref={hitRef}
        className={`${slotClassName} ${d.hit}`}
        role="button" tabIndex={0} aria-pressed={flipped} aria-label={cardText.label(person)}
        onPointerDown={e => {
          dragged.current = false;
          if (e.pointerType === "touch" && touchTilt) { drag.current = { x: e.clientX, y: e.clientY, moved: false }; tiltAt(e); }
        }}
        onPointerMove={e => {
          if (e.pointerType !== "touch") { if (hover) tiltAt(e); return; }
          const t = drag.current;
          if (!t) return;
          if (Math.hypot(e.clientX - t.x, e.clientY - t.y) > 10) t.moved = true;
          tiltAt(e);
        }}
        onPointerUp={e => { if (e.pointerType === "touch") { dragged.current = !!drag.current?.moved; drag.current = null; tilt(0, 0); } }}
        onPointerCancel={() => { drag.current = null; tilt(0, 0); }}
        onPointerLeave={e => { if (hover && e.pointerType !== "touch") tilt(0, 0); }}
        onClick={() => { if (dragged.current) { dragged.current = false; return; } setFlipped(v => !v); }}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setFlipped(v => !v); } }}
      >
        <div ref={tiltRef} className={d.tilt}>
          <div className={`${d.flip} ${flipped ? d.flipped : ""}`}>
            <div ref={frontRef} className={`${d.side} ${d.front}`} />
            <div ref={backRef} className={`${d.side} ${d.back}`} />
          </div>
        </div>
        <LinkLayer person={person} active={flipped} />
        <span className={d.srOnly} aria-live="polite">{flipped ? backText : ""}</span>
      </div>
    </div>
  );
}
