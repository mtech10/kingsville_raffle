import Logo from "../Logo";

export default function Footer() {
  return (
    <footer className="bg-emerald-950 py-10 text-emerald-50/70">
      <div className="container-x flex flex-col items-center justify-between gap-5 text-center text-sm md:flex-row md:text-left">
        <Logo />

        <p>© {new Date().getFullYear()} Kingsville Estate</p>
      </div>
    </footer>
  );
}
