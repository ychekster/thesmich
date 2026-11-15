import { Fragment } from "react";
import { about } from "../../content/home";
import { Lines, r } from "../../pager/reveal";
import ui from "../ui.module.css";
import s from "./About.module.css";

/** О студии: «THE SMICH / ЭТО — студия, которая…» и абзац справа. */
export function About() {
  return (
    <div className={s.about}>
      <Lines lines={[about.title]} className={ui.h1} />
      <div className={s.row}>
        <Lines as="p" lines={[about.word]} className={ui.h1} from={1} />
        <p className={`${ui.tagline} ${s.tagline}`} {...r(2)}>
          {about.tagline.map((l, k) => (
            <Fragment key={k}>{k > 0 && <br className={ui.desktop} />}{k > 0 && " "}{l}</Fragment>
          ))}
        </p>
      </div>
      <div className={s.text}>
        {about.text.map((t, k) => (
          <p key={k} className={ui.lead} {...r(3 + k)}>{t}</p>
        ))}
      </div>
    </div>
  );
}
