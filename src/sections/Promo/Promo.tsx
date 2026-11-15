import { useState } from "react";
import { promo } from "../../content/home";
import { Lines, r } from "../../pager/reveal";
import ui from "../ui.module.css";
import s from "./Promo.module.css";

/**
 * Промо-ролик с YouTube. Плеер (iframe) грузится только по нажатию — до этого
 * рамка с кнопкой: тяжёлый iframe не мешает плавности переходов. Без youtubeId —
 * заглушка «Ролик скоро появится».
 */
export function Promo() {
  const [play, setPlay] = useState(false);
  const id = promo.youtubeId;
  return (
    <div className={s.promo}>
      <div className={s.head}>
        <p className={ui.eyebrow} {...r(0)}>{promo.eyebrow}</p>
        <Lines lines={promo.title} className={ui.title} from={1} />
      </div>
      <div className={s.frame} {...r(3)}>
        {id && play ? (
          <iframe
            className={s.video} title={promo.eyebrow} allowFullScreen
            src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          />
        ) : (
          <button className={s.poster} type="button" disabled={!id} onClick={() => setPlay(true)}>
            <span className={s.play} aria-hidden="true" />
            <span className={s.caption}>{id ? promo.play : promo.soon}</span>
          </button>
        )}
      </div>
    </div>
  );
}
