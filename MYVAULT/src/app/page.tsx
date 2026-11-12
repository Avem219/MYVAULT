"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Check,
  CircleDollarSign,
  Copy,
  CreditCard,
  ExternalLink,
  KeyRound,
  Link2,
  LoaderCircle,
  LogOut,
  ShieldCheck,
  WalletCards
} from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

type Provider = "mtn_momo" | "airtel_money" | "paypal" | "flutterwave";

type CreatedLink = {
  id: string;
  token: string;
  title: string | null;
  amount: number | null;
  currency: string;
  provider: string | null;
  expires_at: string | null;
};

const providers: { value: Provider; label: string }[] = [
  { value: "mtn_momo", label: "MTN Mobile Money" },
  { value: "airtel_money", label: "Airtel Money" },
  { value: "paypal", label: "PayPal" },
  { value: "flutterwave", label: "Flutterwave" }
];

const currencies = ["UGX", "USD", "EUR", "GBP", "KES", "TZS", "NGN"];

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [title, setTitle] = useState("Personal contribution");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("UGX");
  const [provider, setProvider] = useState<Provider>("mtn_momo");
  const [expiresAt, setExpiresAt] = useState("");
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<CreatedLink | null>(null);
  const [copied, setCopied] = useState(false);

  const paymentUrl = useMemo(() => {
    if (!created || typeof window === "undefined") return "";
    return `${window.location.origin}/pay/${encodeURIComponent(created.token)}`;
  }, [created]);

  useEffect(() => {
    let alive = true;
    let subscription: { unsubscribe: () => void } | undefined;

    try {
      const supabase = getSupabase();
      supabase.auth.getSession().then(({ data, error: sessionError }) => {
        if (!alive) return;
        if (sessionError) setError(sessionError.message);
        setUser(data.session?.user ?? null);
        setChecking(false);
      });

      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        if (alive) setUser(session?.user ?? null);
      });
      subscription = data.subscription;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Supabase configuration error.");
      setChecking(false);
    }

    return () => {
      alive = false;
      subscription?.unsubscribe();
    };
  }, []);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setAuthBusy(true);

    try {
      const supabase = getSupabase();
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: window.location.origin }
      });
      if (authError) throw authError;
      setNotice("Sign-in link sent. Check your email and open the link on this device.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send sign-in link.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function signOut() {
    setError("");
    try {
      const { error: signOutError } = await getSupabase().auth.signOut();
      if (signOutError) throw signOutError;
      setCreated(null);
      setNotice("You have signed out.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-out failed.");
    }
  }

  async function createLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setCreated(null);

    const numericAmount = amount.trim() === "" ? null : Number(amount);
    if (numericAmount !== null && (!Number.isFinite(numericAmount) || numericAmount <= 0)) {
      setError("Enter a valid amount greater than zero, or leave the amount blank for a custom contribution.");
      return;
    }

    setCreating(true);
    try {
      const { data, error: rpcError } = await getSupabase().rpc(
        "myvault_create_payment_link",
        {
          p_title: title.trim() || null,
          p_amount: numericAmount,
          p_currency: currency,
          p_provider: provider,
          p_expires_at: expiresAt ? new Date(expiresAt).toISOString() : null
        }
      );

      if (rpcError) throw rpcError;

      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.token) {
        throw new Error("The database did not return a payment-link token.");
      }
      setCreated(row as CreatedLink);
      setNotice("Payment link record created. Provider checkout is not connected yet.");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not create the link. Confirm that this signed-in account is a MYVAULT admin."
      );
    } finally {
      setCreating(false);
    }
  }

  async function copyLink() {
    if (!paymentUrl) return;
    try {
      await navigator.clipboard.writeText(paymentUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Clipboard access was blocked. Copy the link manually.");
    }
  }

  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="MYVAULT home">
          <span className="brand-mark"><WalletCards size={22} /></span>
          <span>MY<span className="gold">VAULT</span></span>
        </a>
        <div className="top-actions">
          <span className="secure-label"><ShieldCheck size={15} /> PRIVATE WORKSPACE</span>
          {user && (
            <button className="signout" onClick={signOut} type="button">
              <LogOut size={15} /> Sign out
            </button>
          )}
        </div>
      </header>

      <section className="hero">
        <div className="eyebrow"><span /> DIGITAL CONTRIBUTION VAULT</div>
        <h1>Make every contribution<br /><em>count.</em></h1>
        <p className="hero-copy">
          Create a clear, shareable payment destination and manage contributions
          from one secure workspace.
        </p>
      </section>

      {error && <div className="alert error" role="alert">{error}</div>}
      {notice && <div className="alert success" role="status">{notice}</div>}

      {checking ? (
        <div className="loading"><LoaderCircle className="spin" /> Checking secure session…</div>
      ) : !user ? (
        <section className="auth-card">
          <div className="section-icon"><KeyRound size={20} /></div>
          <div>
            <p className="eyebrow">ADMIN ACCESS</p>
            <h2>Enter your vault</h2>
            <p className="muted">Sign in with the administrator email registered in Supabase.</p>
          </div>
          <form onSubmit={signIn} className="auth-form">
            <label htmlFor="email">Administrator email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button className="primary-button" disabled={authBusy} type="submit">
              {authBusy ? <LoaderCircle className="spin" size={17} /> : <ArrowUpRight size={17} />}
              Send secure sign-in link
            </button>
          </form>
          <p className="fine-print">Access is restricted by Supabase authentication and MYVAULT database admin policies.</p>
        </section>
      ) : (
        <section className="dashboard">
          <div className="welcome-row">
            <div>
              <p className="eyebrow">CONTROL CENTRE</p>
              <h2>Your vault dashboard</h2>
              <p className="muted">Signed in as {user.email}</p>
            </div>
            <div className="status-pill"><span /> SESSION ACTIVE</div>
          </div>

          <div className="stat-grid">
            <div className="stat-card">
              <span className="stat-icon"><Link2 size={18} /></span>
              <span className="stat-label">PAYMENT LINKS</span>
              <strong>Ready to create</strong>
              <small>Generate a contribution link below</small>
            </div>
            <div className="stat-card">
              <span className="stat-icon"><CircleDollarSign size={18} /></span>
              <span className="stat-label">PAYMENT STATUS</span>
              <strong>Not connected</strong>
              <small>Provider checkout and verification remain to be integrated</small>
            </div>
            <div className="stat-card">
              <span className="stat-icon"><CreditCard size={18} /></span>
              <span className="stat-label">SUPPORTED PROVIDERS</span>
              <strong>4 selected</strong>
              <small>MTN · Airtel · PayPal · Flutterwave</small>
            </div>
          </div>

          <div className="content-grid">
            <section className="panel create-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">NEW DESTINATION</p>
                  <h3>Create a payment link</h3>
                </div>
                <span className="panel-symbol"><Link2 size={19} /></span>
              </div>
              <form onSubmit={createLink} className="create-form">
                <div className="field">
                  <label htmlFor="title">Link title</label>
                  <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} placeholder="What is this contribution for?" />
                </div>
                <div className="two-fields">
                  <div className="field">
                    <label htmlFor="amount">Fixed amount <span>(optional)</span></label>
                    <input id="amount" type="number" min="1" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Leave blank for custom" />
                  </div>
                  <div className="field">
                    <label htmlFor="currency">Currency</label>
                    <select id="currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                      {currencies.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="provider">Preferred provider</label>
                  <select id="provider" value={provider} onChange={(e) => setProvider(e.target.value as Provider)}>
                    {providers.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="expires">Expiry <span>(optional)</span></label>
                  <input id="expires" type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
                </div>
                <button className="primary-button" type="submit" disabled={creating}>
                  {creating ? <LoaderCircle className="spin" size={17} /> : <ArrowUpRight size={17} />}
                  Create payment link
                </button>
              </form>
              {created && (
                <div className="created-result">
                  <div className="created-heading"><Check size={17} /> Link record created</div>
                  <p className="muted">The public payment page must be implemented before sharing this URL.</p>
                  <div className="copy-row">
                    <input readOnly value={paymentUrl} aria-label="Created payment link" />
                    <button type="button" onClick={copyLink} aria-label="Copy link">
                      {copied ? <Check size={17} /> : <Copy size={17} />}
                    </button>
                  </div>
                </div>
              )}
            </section>

            <aside className="side-column">
              <section className="panel">
                <p className="eyebrow">NEXT INTEGRATIONS</p>
                <h3>Complete the vault</h3>
                <ul className="task-list">
                  <li><span className="task-dot done"><Check size={12} /></span><div><b>Supabase project</b><small>Database and admin foundation created</small></div></li>
                  <li><span className="task-dot">2</span><div><b>Public payment page</b><small>Token lookup, amount selection and sender details</small></div></li>
                  <li><span className="task-dot">3</span><div><b>Provider checkout</b><small>Server-side integrations and credentials</small></div></li>
                  <li><span className="task-dot">4</span><div><b>Verified webhooks</b><small>Confirm amount, currency and provider reference</small></div></li>
                  <li><span className="task-dot">5</span><div><b>History and QR</b><small>Transactions, downloadable QR and share tools</small></div></li>
                </ul>
              </section>
              <section className="security-note">
                <ShieldCheck size={19} />
                <div><b>Security first</b><p>Only verified provider notifications can mark a transaction as paid. Never trust a browser redirect as proof of payment.</p></div>
              </section>
              <a className="supabase-link" href="https://supabase.com/dashboard/project/qbtirahtgoxjaoddvmxr" target="_blank" rel="noreferrer">
                Open Supabase project <ExternalLink size={14} />
              </a>
            </aside>
          </div>
        </section>
      )}

      <footer className="footer">
        <span>MYVAULT <span className="gold">© 2026</span></span>
        <span>BUILT FOR CLARITY. DESIGNED FOR TRUST.</span>
      </footer>
    </main>
  );
}
