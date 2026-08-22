export const BRAND_LOGO_PATH = "/assets/brand/one-life-circle-logo.jpeg";

export default function BrandLogo({
  className = "",
  size = "default",
  tone = "light",
  alt = "One Life Circle",
}) {
  return (
    <span className={`brand-logo brand-logo-${size} brand-logo-on-${tone} ${className}`.trim()}>
      <img src={BRAND_LOGO_PATH} alt={alt} />
    </span>
  );
}
