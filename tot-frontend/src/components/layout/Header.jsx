// src/components/layout/Header.jsx (Updated)
import { useRef, useState } from "react";
import "./header.css";

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
  const [active, setActive] = useState(false);
  const categoryTrigger = useRef(null);
  // If no user is logged in, don't render the header content
  if (!user) return null;

  return (
    <header className="w-full lg:w-auto">
      {/* Mobile Top Header: Displays TOT logo on mobile/tablet */}
      <div className="mobile-top-header lg:hidden flex items-center justify-between px-4 py-2.5 bg-white/40 backdrop-blur-md border-b border-cyan-50/50 shadow-sm w-full">
        <button
          onClick={onGoToFeed}
          className="flex items-center gap-2.5 focus:outline-none cursor-pointer bg-transparent border-0 p-0 text-left group"
          aria-label="Go to Feed"
        >
          <span className="logoContainer w-10 h-10 rounded-full flex items-center justify-center font-bold overflow-hidden shadow-md ring-2 ring-white/60 group-hover:scale-105 transition-transform duration-200">
            <img
              className="w-full h-full object-cover rounded-full"
              src="/tot.jpg"
              alt="Trends of TUM Logo"
            />
          </span>
          <span className="text-xl sm:text-2xl text-blue-900 cherry-bomb font-black tracking-wide">
            Trends of TUM
          </span>
        </button>
      </div>

      <nav className="navbar flex lg:flex-col w-full lg:w-20 lg:h-screen items-center justify-between lg:justify-start px-4 lg:px-8 py-2 lg:py-15 gap-2 lg:gap-9">
        <div
          className="logo w-fit hidden lg:flex cursor-pointer"
          onClick={onGoToFeed}
          title="Trends of TUM"
        >
          <span className="logoContainer w-12 h-12 flex items-center justify-center font-bold mx-auto mb-1">
            <img
              className="object-cover rounded-full shadow-md"
              src="/tot.jpg"
              alt="Trends of TUM Logo"
            />
          </span>
        </div>

        <div className="group flex flex-col items-center gap-1">
          <button
            className="homeBtn icon bg-[url('/assets/images/home.png')] hover:bg-[url('/assets/images/solidHome.png')]"
            onClick={onGoToFeed}
            aria-label="Home"
            aria-current={currentView === "feed" ? "page" : undefined}
          ></button>
          <p className="invisible group-hover:visible text-xs ">Home</p>
        </div>

        <div className="group flex flex-col items-center gap-1">
          <button
            className=" contactBtn icon bg-[url('/assets/images/contact.png')] hover:bg-[url('/assets/images/medias.png')]"
            onClick={onGoToChat}
            aria-label="Chat"
            aria-current={currentView === "chat" ? "page" : undefined}
          ></button>
          <p className="invisible group-hover:visible text-xs">Chat</p>
        </div>

        {currentView === "feed" && categories?.length > 0 && (
          <div
            className="category-control group flex flex-col items-center gap-1"
            onKeyDown={(event) => {
              if (event.key !== "Escape" || !active) return;
              event.preventDefault();
              setActive(false);
              categoryTrigger.current?.focus();
            }}
          >
            <button
              ref={categoryTrigger}
              type="button"
              className="category-glass category-trigger"
              onClick={() => setActive((open) => !open)}
              aria-label="Toggle feed categories"
              aria-controls="feed-category-menu"
              aria-expanded={active}
            >
              <img src="/assets/images/app.png" alt="" />
            </button>
            <p className="invisible group-hover:visible text-xs">Category</p>
            <ul
              id="feed-category-menu"
              className="category-orbit"
              aria-label="Feed categories"
              aria-hidden={!active}
              data-open={active}
              inert={!active}
            >
              {categories.slice().reverse().map((category, index) => (
                <li className="category-orbit-item" key={category.id} style={{ "--category-index": index }}>
                  <button
                    type="button"
                    className="category-glass category-orbit-button"
                    aria-label={category.name}
                    aria-pressed={selectedCats.includes(category.id)}
                    title={category.name}
                    onClick={() => toggleCat(category.id)}
                  >
                    <img src={category.icon} alt="" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="group flex flex-col items-center gap-1">
          <button
            className=" profileBtn icon bg-[url('/assets/images/user.png')] hover:bg-[url('/assets/images/users.png')]"
            onClick={onGoToMyProfile}
            aria-label="My profile"
            aria-current={currentProfileId === user.id && (currentView === "profile" || currentView === "editProfile") ? "page" : undefined}
          ></button>
          <p className="invisible group-hover:visible text-xs">Profile</p>
        </div>

        {/* Always show Logout */}
        <div className="group flex flex-col items-center gap-1">
          <button
            className=" logoutBtn icon bg-[url('/assets/images/out.png')] hover:bg-[url('/assets/images/logouts.png')]"
            onClick={onLogout}
            aria-label="Log out"
          ></button>
          <p className="invisible group-hover:visible text-xs">Logout</p>
        </div>
      </nav>
    </header>
  );
}
