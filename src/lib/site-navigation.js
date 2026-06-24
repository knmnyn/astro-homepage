import { sitePath } from "./site-path";

export const primaryNavItems = [
  {
    href: sitePath(""),
    label: "Home",
    title: "Return to the homepage",
  },
  {
    href: sitePath("research/"),
    label: "Research",
    title: "Browse the research page",
  },
  {
    href: sitePath("teaching/"),
    label: "Teaching",
    title: "Browse the teaching archive",
  },
  {
    href: sitePath("publications/"),
    label: "Publications",
    title: "Browse the publications archive",
  },
  {
    href: sitePath("service/"),
    label: "Service",
    title: "Browse the service overview",
  },
  {
    href: sitePath("miscellaneous/"),
    label: "Miscellaneous",
    title: "Browse the miscellaneous archive",
  },
];
