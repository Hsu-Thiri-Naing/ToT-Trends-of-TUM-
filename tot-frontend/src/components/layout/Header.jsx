import { useEffect, useRef, useState } from "react";
import { LuHouse, LuLayoutGrid, LuLogOut, LuMessagesSquare, LuUserRound } from "react-icons/lu";
import "./header.css";

function CategoryControl({ categories, selectedCats, toggleCat }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef(null);
  const control = useRef(null);

  useEffect(() => {
    if (!open) return;
    const dismiss = (event) => {
      if (!control.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);

  return (
    <div
      ref={control}
      className="category-control"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (!open || event.key !== "Escape") return;
        event.preventDefault();
        setOpen(false);
        trigger.current?.focus();
      }}
    >
      <button
        ref={trigger}
        type="button"
        className="nav-action category-trigger"
        onClick={() => setOpen((previous) => !previous)}
        aria-controls="feed-category-menu"
        aria-expanded={open}
      >
        <LuLayoutGrid aria-hidden="true" />
        <span>Filters</span>
      </button>
      <ul
        id="feed-category-menu"
        className="category-orbit"
        aria-label="Feed categories"
        aria-hidden={!open}
        data-open={open}
        inert={!open}
      >
        {categories.map((category, index) => (
          <li className="category-orbit-item" key={category.id} style={{ "--category-index": index }}>
            <button
              type="button"
              className="glass-lens category-orbit-button"
              aria-label={category.name}
              aria-pressed={selectedCats.includes(category.id)}
              title={category.name}
              onClick={() => toggleCat(category.id)}
            >
              <img src={category.icon} alt="" width="22" height="22" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Header({
  user,
  currentView,
  currentProfileId,
  onGoToFeed,
  onGoToMyProfile,
  onGoToChat,
  onLogout,
  categories,
  selectedCats,
  toggleCat,
}) {
  if (!user) return null;

  const isMyProfile = currentProfileId === user.id
    && (currentView === "profile" || currentView === "editProfile");

  return (
    <header className="site-header">
      <div className="mobile-top-header liquid-glass">
        <button type="button" className="nav-brand" onClick={onGoToFeed} aria-label="Go to Feed">
          <img src="/tot.jpg" alt="" width="40" height="40" />
          <span className="cherry-bomb">Trends of TUM</span>
        </button>
      </div>

      <nav className="navbar liquid-glass glass-responsive" aria-label="Main navigation">
        <button type="button" className="nav-brand nav-brand-desktop" onClick={onGoToFeed} aria-label="Go to Feed">
          <img src="/tot.jpg" alt="" width="44" height="44" />
        </button>

        <button type="button" className="nav-action" onClick={onGoToFeed} aria-current={currentView === "feed" ? "page" : undefined}>
          <LuHouse aria-hidden="true" />
          <span>Home</span>
        </button>

        <button type="button" className="nav-action" onClick={onGoToChat} aria-current={currentView === "chat" ? "page" : undefined}>
          <LuMessagesSquare aria-hidden="true" />
          <span>Chat</span>
        </button>

        {currentView === "feed" && categories?.length > 0 && (
          <CategoryControl categories={categories} selectedCats={selectedCats} toggleCat={toggleCat} />
        )}

        <button type="button" className="nav-action" onClick={onGoToMyProfile} aria-label="My profile" aria-current={isMyProfile ? "page" : undefined}>
          <LuUserRound aria-hidden="true" />
          <span>Profile</span>
        </button>

        <button type="button" className="nav-action nav-logout" onClick={onLogout}>
          <LuLogOut aria-hidden="true" />
          <span>Log out</span>
        </button>
      </nav>
    </header>
  );
}
