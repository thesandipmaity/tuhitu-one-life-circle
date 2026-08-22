import Link from "../components/Link";
import { useApp } from "../components/app-provider";
import { EventCard } from "../components/ui";
import { Icon } from "../components/icons";
import { events } from "../data/site-data";

function CommunityPage() {
  const { openJoin } = useApp();

  return <>
      <section className="section upcoming-section community-experiences-hero">
        <div className="container">
          <div className="section-heading community-page-heading">
            <p className="eyebrow">16 WAYS TO TAKE PART</p>
            <h1>16 ways to take part — across interests and generations.</h1>
            <p>Start with movement, family wellness, mindful connection and shared stories, then discover creative, local and food experiences. Final schedules, access and pricing are confirmed programme by programme.</p>
          </div>
          <div className="event-grid">
            {events.map((event) => <EventCard key={event.slug} event={event} />)}
          </div>
        </div>
      </section>

      <section className="section community-conversion-section">
        <div className="container community-conversion-grid">
          <img src="/assets/intergenerational-community.webp" alt="Young and older adults learning and creating together" loading="lazy" />
          <div>
            <p className="eyebrow">COMPANIONSHIP & THE WIDER CIRCLE</p>
            <h2>Meaningful connection. More ways to take part.</h2>
            <p>Companionship is one dedicated programme within a much wider Circle of movement, learning, creativity, food, family wellness and local experiences. Younger and older participants can connect through conversation, reading, music, digital assistance, walks and shared activities — always with dignity.</p>
            <p>Membership helps people participate and save; becoming a Companion is a separate way to contribute time and presence.</p>
            <div className="hero-actions"><button className="button button-primary button-large" onClick={() => openJoin("Community combined CTA")}>Become a Member <Icon name="arrow" /></button><Link className="button button-secondary button-large" href="/become-a-companion">Become a Companion</Link></div>
            <small>Programme schedules, access, eligibility and pricing remain subject to event-specific terms.</small>
          </div>
        </div>
      </section>
    </>;
}

export { CommunityPage };
