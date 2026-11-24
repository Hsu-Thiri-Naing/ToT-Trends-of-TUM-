import "./login.css";

export default function AuthPanel({ title, children, footer }) {
  return (
    <div className="auth-page">
      <a className="auth-about glass-lens" href="https://landingpage-tot.vercel.app/">About ToT</a>
      <section className="loginContainer auth-glass-panel liquid-glass glass-responsive">
        <img className="auth-logo" src="/tot.jpg" width="64" height="64" alt="Trends of TUM" />
        <h1>{title}</h1>
        {children}
        <footer className="auth-switch">{footer}</footer>
      </section>
    </div>
  );
}
