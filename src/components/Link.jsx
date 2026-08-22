import { Link as RouterLink } from "react-router-dom";

export default function Link({ href, to, children, ...props }) {
  const destination = to ?? href ?? "/";
  if (typeof destination === "string" && destination.startsWith("#")) {
    return <a href={destination} {...props}>{children}</a>;
  }
  return (
    <RouterLink to={destination} {...props}>
      {children}
    </RouterLink>
  );
}
