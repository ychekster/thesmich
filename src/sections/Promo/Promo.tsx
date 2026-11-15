import { useState } from "react";
import { promo } from "../../content/home";
import { Lines, r } from "../../pager/reveal";
import ui from "../ui.module.css";
import s from "./Promo.module.css";

const phone = () => matchMedia("(max-width: 760px)").matches;

/**
 * Промо-ролик с YouTube: на компьютере рамка 16:9, на телефоне — вертикальная.
 * Плеер (iframe) грузится только по нажатию — до этого рамка с кнопкой: тяжёлый
 * iframe не мешает плавности переходов. Без ID ролика — «Ролик скоро появится».
 */
export function Promo() {
  const [video, setVideo] = useState("");
  const any = promo.youtubeId || promo.youtubeIdVertical;
  const start = () => {
    const id = phone() ? promo.youtubeIdVertical || promo.youtubeId : promo.youtubeId || promo.youtubeIdVertical;
    setVideo(id);
  };
  return (
    <div className={s.promo}>
      <Lines lines={[promo.title]} className={`${ui.h1} ${s.title}`} />
      <div className={s.frame} {...r(1)}>
        {video ? (
          <iframe
            className={s.video} title={promo.caption} allowFullScreen
            src={`https://www.youtube-nocookie.com/embed/${video}?autoplay=1&rel=0`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          />
        ) : (
          <>
            <p className={s.caption}>{promo.caption}</p>
            {!any && <p className={s.soon}>{promo.soon}</p>}
            <button className={s.play} type="button" disabled={!any} onClick={start} aria-label={promo.play}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
            </button>
            <span className={`${ui.corner} ${s.corner}`} aria-hidden="true" />
          </>
        )}
      </div>
    </div>
  );
}
