import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { AppProvider } from "./components/app-provider";
import { catalogue, events, siteMeta } from "./data/site-data";
import { HomePage } from "./pages/home-page";
import { MembershipPage } from "./pages/membership-page";
import { StorePage } from "./pages/store-page";
import { CommunityPage } from "./pages/community-page";
import { AboutSupportPage } from "./pages/about-support-page";
import {
  AccessCardPage,
  AccountPage,
  CartPage,
  CheckoutPage,
  ConfirmationPage,
  ForgotPasswordPage,
  LegalPage,
  LoginPage,
  ProductDetailPage,
  VerifyPage,
} from "./pages/utility-pages";
import { MembershipRegistrationPage } from "./pages/membership-registration-page";
import { CompanionPage } from "./pages/companion-page";
import { ExperienceDetailPage } from "./pages/experience-detail-page";
import { NotFoundPage } from "./pages/not-found-page";

const pageMeta = {
  "/": [siteMeta.title, siteMeta.description],
  "/membership": ["Membership Plans & Benefits | One Life Circle", "Compare Community at ₹6,000/year for ₹50,000+ potential value, Active at ₹24,000 for ₹1 lakh+, and Signature at ₹48,000 for ₹2 lakh+."],
  "/store": ["Member Store | One Life Circle", "Preview curated wellness products, better everyday choices, services and experiences with protected member pricing."],
  "/community": ["Community & Experiences | One Life Circle", "Discover 16 activity formats led by movement, family wellness, mindful connection and shared stories, followed by creative, local and food experiences."],
  "/about-support": ["About, Vision, Team & Support | One Life Circle", "Learn how One Life Circle connects people and families with better choices, wellness, experiences and partner benefits."],
  "/login": ["Member Login | One Life Circle", "Access your secure One Life Circle member account."],
  "/account": ["My Account | One Life Circle", "Review your membership, card, bookings, orders and saved offers."],
  "/my-account": ["My Account | One Life Circle", "Review your membership, card, bookings, orders and saved offers."],
  "/access-card": ["Digital Membership Card | One Life Circle", "Access the protected One Life Circle digital membership card."],
  "/cart": ["Member Cart | One Life Circle", "Review products selected from the One Life Circle Member Store."],
  "/checkout": ["Secure Member Checkout | One Life Circle", "Complete an eligible member order through verified server pricing and secure payment."],
  "/booking-confirmation": ["Booking Confirmation | One Life Circle", "Review the One Life Circle booking confirmation state."],
  "/order-confirmation": ["Order Confirmation | One Life Circle", "Review the One Life Circle order confirmation state."],
  "/forgot-password": ["Recover Member Access | One Life Circle", "Review the secure member-access recovery journey."],
  "/membership-registration": ["Join One Life Circle", "Choose Community, Active or Signature and begin your annual membership registration."],
  "/join": ["Join One Life Circle", "Choose Community, Active or Signature and begin your annual membership registration."],
  "/become-a-companion": ["Become a Companion | One Life Circle", "Apply to support meaningful One Life Circle community participation."],
  "/legal": ["Legal & Trust | One Life Circle", "Review One Life Circle privacy, membership, store and wellbeing notices."],
};

const legalTitles = {
  privacy: "Privacy Policy",
  "membership-terms": "Terms of Membership",
  "store-terms": "Member Store Terms",
  "partner-terms": "Partner Terms & Disclaimers",
  "cancellation-refund": "Cancellation & Refund Policy",
  "medical-disclaimer": "Medical Information Disclaimer",
};

function metadataFor(pathname) {
  if (pathname.startsWith("/store/")) {
    const item = catalogue.find((entry) => `/store/${entry.slug}` === pathname);
    if (item) return [`${item.title} | One Life Circle`, `${item.description} Member eligibility and partner terms apply.`];
  }
  if (pathname.startsWith("/experiences/")) {
    const event = events.find((entry) => `/experiences/${entry.slug}` === pathname);
    if (event) return [`${event.title} | One Life Circle`, event.description];
  }
  if (pathname.startsWith("/verify/")) {
    return ["Verify Membership | One Life Circle", "Verify minimum approved One Life Circle membership information."];
  }
  if (pathname.startsWith("/legal/")) {
    const slug = pathname.split("/").filter(Boolean).at(-1);
    return [`${legalTitles[slug] ?? "Legal & Trust"} | One Life Circle`, pageMeta["/legal"][1]];
  }
  return pageMeta[pathname] ?? ["Page Not Found | One Life Circle", "Return to the One Life Circle website."];
}

function MetaManager() {
  const { pathname } = useLocation();

  useEffect(() => {
    const [title, description] = metadataFor(pathname);
    document.title = title;
    document.querySelector('meta[name="description"]')?.setAttribute("content", description);
    document.querySelector('meta[property="og:title"]')?.setAttribute("content", title);
    document.querySelector('meta[property="og:description"]')?.setAttribute("content", description);
  }, [pathname]);

  return null;
}

function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (hash) {
        document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        window.scrollTo({ top: 0, behavior: "auto" });
        document.getElementById("main-content")?.focus({ preventScroll: true });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [hash, pathname]);
  return null;
}

export default function App() {
  return (
    <AppProvider>
      <MetaManager />
      <ScrollManager />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/membership" element={<MembershipPage />} />
        <Route path="/store" element={<StorePage />} />
        <Route path="/store/:slug" element={<ProductDetailPage />} />
        <Route path="/community" element={<CommunityPage />} />
        <Route path="/experiences/:slug" element={<ExperienceDetailPage />} />
        <Route path="/about-support" element={<AboutSupportPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/my-account" element={<AccountPage />} />
        <Route path="/access-card" element={<AccessCardPage />} />
        <Route path="/verify/:token" element={<VerifyPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/booking-confirmation" element={<ConfirmationPage type="booking" />} />
        <Route path="/order-confirmation" element={<ConfirmationPage type="order" />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/membership-registration" element={<MembershipRegistrationPage />} />
        <Route path="/join" element={<MembershipRegistrationPage />} />
        <Route path="/become-a-companion" element={<CompanionPage />} />
        <Route path="/legal/:slug" element={<LegalPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppProvider>
  );
}
