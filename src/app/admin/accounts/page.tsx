"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { LoaderCircle } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { AdminHeader } from "@/components/admin/admin-header";
import { ThemeProvider, useTheme } from "@/components/preview/preview-theme";

type Account = { id: string; name: string; email: string; role: "user" | "admin"; created_at: string };
type AuditEntry = { id: number; actor_id: string | null; actor_label: string | null; target_id: string | null; action: string; created_at: string };
type TotpSetup = { step: "verify-existing" | "enroll"; factorId: string; qrCode?: string; secret?: string };

function AdminAccountsPageInner() {
  const { theme } = useTheme();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [setup, setSetup] = useState<TotpSetup | null>(null);
  const [code, setCode] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/accounts", { cache: "no-store" });
      const result = await response.json();
      if (response.status === 403 && result.code === "MFA_REQUIRED") {
        setMfaRequired(true);
        setAccounts([]);
        setAudit([]);
      } else if (!response.ok) {
        setError(result.error || "Administrator accounts could not be loaded.");
      } else {
        setMfaRequired(false);
        setAccounts(result.profiles);
        setAudit(result.audit);
      }
    } catch {
      setError("Administrator accounts could not be loaded. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function submit(action: "invite" | "promote" | "demote", userId?: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "invite" ? { action, email } : { action, userId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The account action failed.");
      setMessage(result.message || "Account action completed.");
      if (action === "invite") setEmail("");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The account action failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submit("invite");
  }

  async function enableMfa() {
    setBusy(true);
    setError("");
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (factorsError) throw factorsError;
      const verifiedFactor = factors.totp.find((factor) => factor.status === "verified");
      if (verifiedFactor) {
        setSetup({ step: "verify-existing", factorId: verifiedFactor.id });
        return;
      }

      for (const factor of factors.totp) {
        if (factor.status !== "verified") {
          const { error: removeError } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
          if (removeError) throw removeError;
        }
      }
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "GridSight admin" });
      if (enrollError) throw enrollError;
      setSetup({ step: "enroll", factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "MFA enrollment could not be started.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyMfa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!setup || busy) return;
    setBusy(true);
    setError("");
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: setup.factorId });
      if (challengeError) throw challengeError;
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: setup.factorId,
        challengeId: challenge.id,
        code: code.trim(),
      });
      if (verifyError) throw verifyError;

      if (setup.step === "verify-existing") {
        const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
        if (factorsError) throw factorsError;
        for (const factor of factors.totp) {
          if (factor.status !== "verified") {
            const { error: removeError } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
            if (removeError) throw removeError;
          }
        }
        let friendlyName = "GridSight admin phone";
        for (let suffix = 2; factors.totp.some((factor) => factor.friendly_name === friendlyName); suffix++) {
          friendlyName = `GridSight admin phone ${suffix}`;
        }
        const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName });
        if (enrollError) throw enrollError;
        setSetup({ step: "enroll", factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
        setCode("");
        setMessage("Authenticator verified. Add this phone as an authenticator using the QR code or setup key below.");
        return;
      }

      setSetup(null);
      setCode("");
      setMessage("New authenticator verified. Administrator account management is now available.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "MFA setup could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="admin-page" data-admin-theme={theme}>
      <AdminHeader activePage="accounts" />
      <div className="admin-content">
        <div className="admin-heading"><div><span className="eyebrow">ACCESS CONTROL</span><h1>Administrator accounts</h1><p>Invite staff, manage confirmed accounts, and review role-change history.</p></div></div>
        {error && <div className="admin-error" role="alert">{error}</div>}
        {message && <div className="admin-success" role="status">{message}</div>}
        {mfaRequired ? (
          <section className="review-panel">
            <div className="review-toolbar"><div><span className="panel-kicker">MULTI-FACTOR AUTHENTICATION</span><h2>{setup?.step === "verify-existing" ? "Verify your current authenticator" : setup?.step === "enroll" ? "Add an authenticator to this phone" : "Set up an authenticator"}</h2></div></div>
            <p className="admin-footnote">{setup?.step === "verify-existing" ? "An authenticator is already linked to this account. Enter its current code to confirm it is you; then a QR code and setup key will appear for this phone." : setup?.step === "enroll" ? "Add this new factor to an authenticator app, then enter its current six-digit code. If you are using the same phone, enter the setup key manually instead of scanning the QR code." : "Administrator access requires a confirmed email and an AAL2 session. If an authenticator is already linked, verify it first to add one on this phone."}</p>
            {setup ? (
              <form className="account-mfa-form" onSubmit={(event) => void verifyMfa(event)}>
                {setup.qrCode && <Image src={setup.qrCode} alt="Authenticator enrollment QR code" width={200} height={200} unoptimized />}
                {setup.secret && <p>Or enter this setup key manually: <code>{setup.secret}</code></p>}
                <label htmlFor="admin-authenticator-code">{setup.step === "verify-existing" ? "Current authenticator code" : "New authenticator code"}<input id="admin-authenticator-code" type="text" inputMode="numeric" autoComplete="one-time-code" autoCapitalize="off" autoCorrect="off" spellCheck={false} value={code} onChange={(event) => setCode(event.target.value)} required minLength={6} maxLength={6} pattern="[0-9]{6}" /></label>
                <button disabled={busy}>{busy ? "Verifying…" : setup.step === "verify-existing" ? "Verify and set up this phone" : "Verify and continue"}</button>
              </form>
            ) : <button className="account-primary-button" disabled={busy} onClick={() => void enableMfa()}>{busy ? "Starting…" : "Set up an authenticator"}</button>}
          </section>
        ) : loading ? (
          <div className="admin-loading"><LoaderCircle size={18} className="loading-icon" /> Loading administrator accounts</div>
        ) : (
          <>
            <section className="review-panel">
              <div className="review-toolbar"><div><span className="panel-kicker">INVITATIONS</span><h2>Invite staff</h2></div></div>
              <form className="account-invite-form" onSubmit={(event) => void handleInvite(event)}>
                <label htmlFor="admin-invite-email">Staff email</label>
                <input id="admin-invite-email" type="email" autoComplete="email" maxLength={254} required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="staff@example.com" />
                <button className="account-primary-button" disabled={busy}>{busy ? "Sending…" : "Send invitation"}</button>
              </form>
              <p className="admin-footnote">Invitations create regular-user accounts. Promote the account below only after the invitee confirms their email.</p>
            </section>
            <section className="review-panel">
              <div className="review-toolbar"><div><span className="panel-kicker">CURRENT ACCESS</span><h2>Accounts</h2></div></div>
              <div className="table-scroll"><table className="review-table"><thead><tr><th>NAME / EMAIL</th><th>ROLE</th><th>CREATED</th><th>ACTION</th></tr></thead><tbody>
                {accounts.map((account) => <tr key={account.id}>
                  <td><strong>{account.name || "Unnamed account"}</strong><small>{account.email}</small></td>
                  <td><span className={`review-state ${account.role === "admin" ? "review-verified" : "review-pending"}`}>{account.role}</span></td>
                  <td>{new Date(account.created_at).toLocaleDateString()}</td>
                  <td>{account.role === "admin"
                    ? <button className="account-row-button" disabled={busy} onClick={() => window.confirm(`Demote ${account.email} to a regular user?`) && void submit("demote", account.id)}>Demote</button>
                    : <button className="account-row-button" disabled={busy} onClick={() => window.confirm(`Promote ${account.email} to administrator?`) && void submit("promote", account.id)}>Promote</button>}
                  </td>
                </tr>)}
                {accounts.length === 0 && <tr><td colSpan={4} className="no-reports">No accounts available.</td></tr>}
              </tbody></table></div>
            </section>
            <section className="review-panel">
              <div className="review-toolbar"><div><span className="panel-kicker">AUDIT TRAIL</span><h2>Recent account actions</h2></div></div>
              <div className="table-scroll"><table className="review-table"><thead><tr><th>ACTION</th><th>ACTOR</th><th>TARGET</th><th>TIME</th></tr></thead><tbody>
                {audit.map((entry) => <tr key={entry.id}><td><span className="review-state review-verified">{entry.action}</span></td><td>{entry.actor_label ?? (entry.actor_id ? `${entry.actor_id.slice(0, 8)}…` : "Unknown")}</td><td>{entry.target_id ? `${entry.target_id.slice(0, 8)}…` : "Deleted account"}</td><td>{new Date(entry.created_at).toLocaleString()}</td></tr>)}
                {audit.length === 0 && <tr><td colSpan={4} className="no-reports">No account actions recorded.</td></tr>}
              </tbody></table></div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

export default function AdminAccountsPage() {
  return (
    <ThemeProvider>
      <AdminAccountsPageInner />
    </ThemeProvider>
  );
}
