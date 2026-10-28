import CentralLogo from "./components/central-logo";

const mono = "font-['Courier_New',Courier,monospace]";

const card =
  "flex min-h-75 flex-col rounded-[14px] border border-(--border) bg-(--background-layer1) p-6 md:min-h-0 " +
  "transition duration-300 ease-out hover:-translate-y-1.5 hover:border-(--primary-colour) " +
  "hover:shadow-[0_18px_40px_-12px_rgba(59,130,246,0.35)] motion-reduce:transition-none motion-reduce:hover:translate-y-0";

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden [@media(min-width:900px)_and_(min-height:640px)]:h-screen">
      <CentralLogo className="pointer-events-none absolute top-8 right-[-20vw] z-0 h-[120vw] w-[120vw] opacity-[0.14] md:top-1/2 md:right-[-14vmin] md:h-[105vmin] md:w-[105vmin] md:translate-y-[-52%] md:opacity-[0.09]" />

      <header className="relative z-10 flex items-center justify-end px-5 py-5.5 sm:px-14">
        <div className={`${mono} flex items-center gap-2 text-[11px] tracking-[0.14em] text-(--muted-foreground)`}>
          <span className="h-1.75 w-1.75 animate-pulse rounded-full bg-(--primary-colour)" />
          UNDER CONSTRUCTION
        </div>
      </header>

      <main className="relative z-10 mx-auto flex min-h-0 w-full max-w-270 flex-1 flex-col px-5 pb-20 justify-center sm:px-14">
        <h1 className="mb-4 max-w-[15em] text-[clamp(30px,5.4vw,58px)] leading-[1.08] font-medium tracking-[-0.02em]">
          Arriving at <span className="text-(--primary-colour)">Central.</span>
        </h1>
        <p className="mb-[clamp(20px,4vh,44px)] pb-10 text-base leading-[1.55] text-(--muted-foreground) lg:whitespace-nowrap">
          The receipt is the atomic unit of the economy, and we’re rebuilding it from the ground up.
        </p>

        <div className="grid min-h-0 flex-1 gap-4 md:max-h-110 md:grid-cols-2">
          <section className={card}>
            <div className={`${mono} mb-3.5 text-[11px] tracking-[0.18em] text-(--muted-foreground)`}>
              <b className="font-semibold text-(--foreground)">CENTRAL</b> | FINANCE
            </div>
            <h2 className="mb-2 text-[22px] font-medium tracking-[-0.01em]">The paper receipt is a relic.</h2>
            <p className="mb-15 text-[14.5px] leading-normal text-(--muted-foreground)">
              One receipt, linked between both parties. Each side confirms, and each ledger mirrors the other. Nothing to reconcile.
            </p>
            <div className={`${mono} mt-auto border-t border-dashed border-(--border) pt-3 text-[12.5px]`}>
              <div className="flex justify-between gap-3 py-1">
                <span>Coca-Cola 330ml</span>
                <span className="text-(--up)">+3</span>
              </div>
              <div className="flex justify-between gap-3 py-1">
                <span>GST</span>
                <span className="text-(--up)">+0.61</span>
              </div>
              <div className="flex justify-between gap-3 py-1">
                <span>AUD</span>
                <span className="text-(--down)">−6.75</span>
              </div>
            </div>
            <div className={`${mono} mt-2.5 text-[11px] tracking-[0.16em] text-(--muted-foreground)`}>COMING SOON</div>
          </section>

          <section className={card}>
            <div className={`${mono} mb-3.5 text-[11px] tracking-[0.18em] text-(--muted-foreground)`}>
              <b className="font-semibold text-(--foreground)">CENTRAL</b> | EXCHANGE
            </div>
            <h2 className="mb-2 text-[22px] font-medium tracking-[-0.01em]">Everything. Compared.</h2>
            <p className="mb-15 text-[14.5px] leading-normal text-(--muted-foreground)">
              One order book for anything you can buy, sell or borrow. Every price in the open, side by side.
            </p>
            <div className={`${mono} mt-auto border-t border-dashed border-(--border) pt-3 text-[12.5px]`}>
              <div className="flex justify-between gap-3 py-1">
                <span className="inline-block h-[0.85em] w-13 self-center rounded-xs bg-(--border)" />
                <span className="text-(--primary-colour)">best → 3.85</span>
              </div>
              <div className="flex justify-between gap-3 py-1">
                <span className="inline-block h-[0.85em] w-17.5 self-center rounded-xs bg-(--border)" />
                <span className="text-(--muted-foreground)">4.20</span>
              </div>
              <div className="flex justify-between gap-3 py-1">
                <span className="inline-block h-[0.85em] w-21 self-center rounded-xs bg-(--border)" />
                <span className="text-(--muted-foreground)">4.60</span>
              </div>
            </div>
            <div className={`${mono} mt-2.5 text-[11px] tracking-[0.16em] text-(--muted-foreground)`}>COMING SOON</div>
          </section>
        </div>
      </main>

      <footer className="relative z-10 px-5 pt-4.5 pb-5.5 sm:px-14">
        <div className={`${mono} text-[11px] tracking-[0.14em] text-(--muted-foreground)`}>
          STRICTLY NEUTRAL BY DESIGN.
        </div>
      </footer>
    </div>
  );
}