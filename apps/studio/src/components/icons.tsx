import type { ReactNode } from "react";

/** The Studio's own small line drawings, so nothing looks borrowed. */
function line(children: ReactNode) {
  return function Icon() {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" width="1em" height="1em">
        {children}
      </svg>
    );
  };
}

export const HomeLine = line(<path d="M4 11.2 12 4.5l8 6.7V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" />);
export const ContentLine = line(<><rect x="4" y="4.5" width="16" height="15" rx="2.5" /><path d="M9.5 4.5v15M13 9h4M13 12.5h4" /></>);
export const PhotosLine = line(<><rect x="3.5" y="5" width="17" height="14" rx="2.5" /><circle cx="9" cy="10" r="1.6" /><path d="m4 17 5-4.2 3.4 2.8 3-2.4L20 16.6" /></>);
export const GuideLine = line(<><path d="M5 5.2c2.6-1 5-.8 7 .8 2-1.6 4.4-1.8 7-.8v13.6c-2.6-1-5-.8-7 .8-2-1.6-4.4-1.8-7-.8z" /><path d="M12 6v13.6" /></>);
export const SearchLine = line(<><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></>);
export const OutLine = line(<path d="M8 16 17 7M9 7h8v8" />);
export const RingsLine = line(<><circle cx="9" cy="14" r="5.2" /><circle cx="15" cy="14" r="5.2" /><path d="m7.5 4.5 1.5 2 1.5-2" /></>);
export const FilmLine = line(<><rect x="3.5" y="5" width="17" height="14" rx="2.5" /><path d="M7.5 5v14M16.5 5v14M3.5 9.5h4M3.5 14.5h4M16.5 9.5h4M16.5 14.5h4" /></>);
export const RupeeLine = line(<path d="M7 5h10M7 9.5h10M7 5h3.5a4.5 4.5 0 0 1 0 9H7l7.5 6" />);
export const QuoteLine = line(<path d="M5 18c2.8-1 4.4-3.2 4.4-6V7H5v5h2.2M14 18c2.8-1 4.4-3.2 4.4-6V7H14v5h2.2" />);
export const MapLine = line(<><path d="M12 21s6.5-5.6 6.5-11a6.5 6.5 0 0 0-13 0c0 5.4 6.5 11 6.5 11z" /><circle cx="12" cy="10" r="2.3" /></>);
export const PlayLine = line(<><rect x="3.5" y="5" width="17" height="14" rx="2.5" /><path d="m10 9 5 3-5 3z" /></>);
export const RoleLine = line(<><rect x="4" y="8" width="16" height="11" rx="2.5" /><path d="M9 8V6.2A1.7 1.7 0 0 1 10.7 4.5h2.6A1.7 1.7 0 0 1 15 6.2V8M4 12.8h16" /></>);
export const TeamLine = line(<><circle cx="9" cy="9" r="3.2" /><path d="M3.5 19c.4-3.2 2.6-5 5.5-5s5.1 1.8 5.5 5M15.5 6.2a3 3 0 0 1 0 5.6M17 14.3c2 .5 3.2 2.2 3.5 4.7" /></>);
export const RecordLine = line(<><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="2.4" /><path d="M12 6a6 6 0 0 1 6 6" /></>);
export const StarLine = line(<path d="m12 4.5 2.3 4.8 5.2.7-3.8 3.6.9 5.2-4.6-2.5-4.6 2.5.9-5.2L4.5 10l5.2-.7z" />);
export const FormLine = line(<><rect x="5" y="3.5" width="14" height="17" rx="2.5" /><path d="M9 8.5h6M9 12h6M9 15.5h3.5" /></>);
export const BoxLine = line(<><path d="m12 3.8 8 4.4v7.6l-8 4.4-8-4.4V8.2z" /><path d="m4 8.2 8 4.4 8-4.4M12 12.6v7.6" /></>);
export const GearLine = line(<><circle cx="12" cy="12" r="2.8" /><path d="M12 3.8v2.4M12 17.8v2.4M3.8 12h2.4M17.8 12h2.4M6.2 6.2l1.7 1.7M16.1 16.1l1.7 1.7M6.2 17.8l1.7-1.7M16.1 7.9l1.7-1.7" /></>);
export const PenLine = line(<path d="m5 19 1-4L16 5l3 3L9 18zM14 7l3 3" />);
export const AlertLine = line(<><path d="M12 4.5 21 19.5H3z" /><path d="M12 10v4.5M12 17.2v.1" /></>);
export const CheckLine = line(<path d="m5 12.5 4.5 4.5L19 7.5" />);
export const LeafLine = line(<><path d="M5 19c0-8 5-13.5 14-14 .5 9-5 14-14 14z" /><path d="M5 19c2.5-4.5 5.5-7 9-9" /></>);
export const TextLine = line(<path d="M5 6.5h14M12 6.5v12M9 18.5h6" />);
