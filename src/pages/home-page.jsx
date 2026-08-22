import Link from "../components/Link";
import { useApp } from "../components/app-provider";
import MembershipCard from "../components/MembershipCard";
import { PlanComparisonTable, SectionHeading } from "../components/ui";
import { Icon } from "../components/icons";
import {
  formatCurrency,
  lifeStages,
  membershipSteps,
  plans,
  valuePillars,
} from "../data/site-data";

function HomePage() {
  const { openJoin } = useApp();

  return <>
      <section className="home-hero value-led-hero">
        <div className="container hero-shell">
          <div className="home-hero-copy reveal">
            <h1 className="hero-brand-heading">One Life Circle</h1>
            <div className="hero-eyebrow"><span className="dot" /> ONE CARD. YEAR-ROUND VALUE.</div>
            <h2 className="hero-value-headline">Get benefits worth <span>₹50,000+</span> with a ₹6,000 annual membership.</h2>
            <div className="hero-positioning-copy">
              <p>TuHiTu One Life Circle is a curated community for people who believe in living life to the fullest - connecting, experiencing, and growing together.</p>
              <p>From engaging activities and wellness experiences to exclusive privileges across 100+ brands, discover a lifestyle designed to help you live well, live more, and live together.</p>
            </div>
            <div className="hero-actions">
              <button className="button button-primary button-large" onClick={() => openJoin("Homepage value hero", "community")}>
                Get Community Membership — ₹6,000 <Icon name="arrow" />
              </button>
              <Link className="button button-secondary button-large" href="#membership-value">
                See What You Get
              </Link>
            </div>
            <p className="value-qualifier">Potential annual value depends on eligible use, location, availability and partner terms.</p>
            <div className="hero-proof-strip" aria-label="Membership value highlights">
              <div className="hero-proof-item"><span className="hero-proof-icon"><Icon name="calendar" /></span><span className="hero-proof-copy"><b>Monthly</b><small>benefit refresh</small></span></div>
              <div className="hero-proof-item"><span className="hero-proof-icon"><Icon name="bag" /></span><span className="hero-proof-copy"><b>Year-round</b><small>member savings</small></span></div>
              <div className="hero-proof-item"><span className="hero-proof-icon"><Icon name="card" /></span><span className="hero-proof-copy"><b>One</b><small>digital membership card</small></span></div>
            </div>
          </div>

          <div className="hero-value-panel reveal delay-1" aria-label="Three One Life Circle membership value levels">
            <div className="hero-value-panel-heading">
              <p className="eyebrow">CHOOSE YOUR VALUE LEVEL</p>
              <h2>Pay once for the year. Keep using the benefits.</h2>
            </div>
            <div className="hero-value-ladder">
              {plans.map((plan) => <button key={plan.id} type="button" className={`hero-value-option ${plan.id}`} onClick={() => openJoin("Homepage value ladder", plan.id)}>
                  <span className="hero-plan-name">{plan.name}</span>
                  <span className="hero-plan-price">Pay {formatCurrency(plan.annualPrice)}<small>/year</small></span>
                  <span className="hero-value-return"><small>Potential annual value</small><strong>{plan.potentialValueLabel}</strong></span>
                  <Icon name="arrow" />
                </button>)}
            </div>
            <div className="hero-membership-card">
              <MembershipCard compact />
              <p><Icon name="shield" /> Your member ID and eligible benefits, together in one digital card.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section value-proof-section" id="membership-value">
        <div className="container">
          <SectionHeading
            eyebrow="WHY THE MEMBERSHIP IS WORTH IT"
            title="See where the value comes from — before you choose a plan."
            copy="The membership combines benefits that can refresh every month with savings and experiences available across the year. Higher tiers increase the eligible allowances, savings and priority."
            align="center"
          />
          <PlanComparisonTable source="Homepage value comparison" />
          <div className="savings-example">
            <span className="savings-example-icon"><Icon name="bag" /></span>
            <div>
              <p className="eyebrow">A SIMPLE SAVINGS EXAMPLE</p>
              <h3>Spend ₹1,00,000 on eligible Member Store purchases across the year.</h3>
              <p>At an illustrative 20–30% member discount, potential savings can be ₹20,000–₹30,000 — before counting eligible companionship, therapies or experiences.</p>
            </div>
            <Link className="button button-secondary" href="/membership#compare-access">Compare Every Benefit <Icon name="arrow" /></Link>
          </div>
          <p className="value-method-note">Values are illustrative potential benefit values, not cash returns or guaranteed savings. Actual value depends on plan eligibility, usage, approved providers, availability, location, exclusions and programme terms.</p>
        </div>
      </section>

      <section className="section wellbeing-section">
        <div className="container">
          <SectionHeading
            eyebrow="MORE THAN A DISCOUNT CARD"
            title="Value for wellness, everyday choices and meaningful connection."
            copy="Use the Circle differently at different stages of life — from practical savings and experiences to therapies, mobility and companionship."
            align="center"
          />
          <div className="value-pillar-grid">
            {valuePillars.map((pillar) => <article className="value-pillar-card" key={pillar.title}>
                <img src={pillar.image} alt="" loading="lazy" />
                <div><span className="value-pillar-icon"><Icon name={pillar.icon} /></span><h3>{pillar.title}</h3><p>{pillar.copy}</p></div>
              </article>)}
          </div>
        </div>
      </section>

      <section className="section life-stage-section">
        <div className="container">
          <SectionHeading eyebrow="VALUE ACROSS LIFE STAGES" title="One membership. Relevance that changes with you." copy="From affordable everyday choices to family wellness, therapies, mobility and companionship, the Circle meets different priorities at different stages." />
          <div className="life-stage-grid">
            {lifeStages.map((stage, index) => <article key={stage.label}><span>{String(index + 1).padStart(2, "0")}</span><p>{stage.label}</p><h3>{stage.title}</h3><small>{stage.copy}</small></article>)}
          </div>
        </div>
      </section>

      <section className="section how-section">
        <div className="container">
          <SectionHeading eyebrow="HOW MEMBERSHIP WORKS" title="Choose your value level, then start using the Circle." copy="Four clear steps take you from plan selection to an active digital membership." />
          <ol className="membership-timeline">
            {membershipSteps.map((step) => <li key={step.number}><span>{step.number}</span><div><h3>{step.title}</h3><p>{step.copy}</p></div></li>)}
          </ol>
        </div>
      </section>

      <section className="section ecosystem-section">
        <div className="container ecosystem-grid">
          <div className="ecosystem-gallery">
            <img className="gallery-large" src="/assets/intergenerational-community.webp" alt="People from different generations taking part in a creative community activity" loading="lazy" />
            <img src="/assets/therapy-ayurveda.webp" alt="An Ayurveda wellness therapy setting" loading="lazy" />
            <img src="/assets/young-everyday-choices.webp" alt="Young adults comparing practical everyday food choices" loading="lazy" />
            <div className="partner-wordmarks">
              <img src="/assets/brand/tuhitu-bliss-logo.webp" alt="TuHiTu Bliss" />
              <img src="/assets/brand/biome-plus-logo.webp" alt="Biome Plus" />
              <span>More benefits<br /><small>as approved partners join</small></span>
            </div>
          </div>
          <div className="closing-cta">
            <p className="eyebrow">YOUR BETTER-LIVING CIRCLE</p>
            <h2>Pay for the access level you need. Get value across the year.</h2>
            <p>Choose Community for the strongest entry value, Active for more monthly use and priority, or Signature for the highest eligible access and premium experiences.</p>
            <div className="closing-actions">
              <button className="button button-primary button-large" onClick={() => openJoin("Homepage closing CTA")}>Choose Your Plan <Icon name="arrow" /></button>
              <Link href="/store" className="text-link">Preview the Member Store <Icon name="arrow" /></Link>
            </div>
          </div>
        </div>
      </section>
    </>;
}

export { HomePage };
