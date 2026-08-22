function Icon({ name, ...props }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  };
  const paths = {
    arrow: <><path d="M5 12h14" {...common} /><path d="m14 7 5 5-5 5" {...common} /></>,
    bag: <><path d="M5 8h14l-1 12H6L5 8Z" {...common} /><path d="M9 9V6a3 3 0 0 1 6 0v3" {...common} /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="3" {...common} /><path d="M8 3v4M16 3v4M3 10h18" {...common} /></>,
    card: <><rect x="3" y="5" width="18" height="14" rx="3" {...common} /><path d="M3 10h18M7 15h4" {...common} /></>,
    check: <path d="m5 12 4 4L19 6" {...common} />,
    chevron: <path d="m8 10 4 4 4-4" {...common} />,
    close: <path d="m6 6 12 12M18 6 6 18" {...common} />,
    community: <><circle cx="8" cy="8" r="3" {...common} /><circle cx="17" cy="9" r="2.5" {...common} /><path d="M3 20c.5-4 2.3-6 5-6s4.5 2 5 6M13 15c3.5-1.5 7 .5 8 4" {...common} /></>,
    eye: <><path d="M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12Z" {...common} /><circle cx="12" cy="12" r="2.5" {...common} /></>,
    heart: <path d="M20.8 5.8a5.5 5.5 0 0 0-7.8 0L12 6.9l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 22l8.8-8.4a5.5 5.5 0 0 0 0-7.8Z" {...common} />,
    lock: <><rect x="5" y="10" width="14" height="11" rx="3" {...common} /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" {...common} /></>,
    menu: <path d="M4 7h16M4 12h16M4 17h16" {...common} />,
    minus: <path d="M5 12h14" {...common} />,
    plus: <path d="M12 5v14M5 12h14" {...common} />,
    search: <><circle cx="11" cy="11" r="7" {...common} /><path d="m20 20-4-4" {...common} /></>,
    shield: <><path d="M12 3 4.5 6v5.5c0 4.8 3 8 7.5 9.5 4.5-1.5 7.5-4.7 7.5-9.5V6L12 3Z" {...common} /><path d="m9 12 2 2 4-4" {...common} /></>,
    spark: <><path d="m12 2 1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5L12 2Z" {...common} /><path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z" {...common} /></>,
    user: <><circle cx="12" cy="8" r="4" {...common} /><path d="M4 21c.7-5 3.4-7 8-7s7.3 2 8 7" {...common} /></>,
    wellness: <><path d="M12 21c0-7 2-12 8-16 0 8-3 13-8 16Z" {...common} /><path d="M12 21C12 14 9 9 4 7c0 7 2.5 11 8 14Z" {...common} /><path d="M12 21V9" {...common} /></>,
    whatsapp: <><path d="M20.5 11.5a8.5 8.5 0 0 1-12.6 7.4L3.5 20l1.2-4.2A8.5 8.5 0 1 1 20.5 11.5Z" {...common} /><path d="M8.5 7.8c.4 4 3.2 6.7 7.2 7.5l1.2-1.7-2.3-1.2-1 1c-1.8-.7-3-1.9-3.7-3.7l1-1-1.2-2.2-1.2 1.3Z" {...common} /></>
  };
  return <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
      {paths[name]}
    </svg>;
}
export {
  Icon
};
