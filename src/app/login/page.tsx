"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bolt, CheckCircle2, LoaderCircle, Mail, ShieldCheck } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Mode = "sign-in" | "create" | "reset" | "update";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return;
    const supabase = createSupabaseBrowserClient();
    void supabase.auth.getUser().then(({ data: { user } }) => { if (user) setEmail(user.email ?? ""); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setMode("update");
    });
    return () => subscription.unsubscribe();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const supabase = createSupabaseBrowserClient();
      if (mode === "reset") {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/login?mode=update`,
        });
        if (resetError) throw resetError;
        setMessage("Password reset instructions are on their way.");
      } else if (mode === "update") {
        const { error: passwordError } = await supabase.auth.updateUser({ password });
        if (passwordError) throw passwordError;
        setMessage("Your password has been updated.");
        router.replace("/");
      } else if (mode === "create") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name, phone } },
        });
        if (signUpError) throw signUpError;
        if (data.session) router.replace("/");
        else setMessage("Check your inbox to confirm your email, then sign in.");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        router.replace("/");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const heading = mode === "create" ? "Join your local grid." : mode === "reset" ? "Reset your password." : mode === "update" ? "Choose a new password." : "Welcome back.";

  return (
    <main className="auth-page">
      <div className="auth-side">
        <Link href="/" className="auth-brand"><span><Bolt size={19} fill="currentColor" /></span>gridsight</Link>
        <div className="auth-story">
          <span className="eyebrow">COMMUNITY POWER WATCH</span>
          <h1>Power feels different when you know.</h1>
          <p>See local reports, share what you notice, and stay one step ahead of an outage.</p>
          <div className="auth-signal"><span className="pulse-dot" /> Community power watch · Surigao City</div>
        </div>
        <span className="auth-copyright">GRID SIGHT · LOCAL KNOWLEDGE, SHARED</span>
      </div>
      <section className="auth-main">
        <Link href="/" className="auth-back"><ArrowLeft size={15} /> Back to live map</Link>
        <div className="auth-form-wrap">
          <span className="eyebrow">{mode === "create" ? "CREATE ACCOUNT" : mode === "reset" || mode === "update" ? "ACCOUNT RECOVERY" : "YOUR GRID, AT A GLANCE"}</span>
          <h2>{heading}</h2>
          <p className="auth-lede">{mode === "create" ? "A little local knowledge makes a big difference." : mode === "reset" ? "We’ll email you a secure password reset link." : mode === "update" ? "Use a new password you haven’t used before." : "Sign in to follow areas and share outage reports."}</p>
          <form onSubmit={submit} className="auth-form">
            {mode === "create" && <>
              <label htmlFor="name">Name</label>
              <input id="name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={100} placeholder="Your name" />
              <label htmlFor="phone">Phone <span>OPTIONAL</span></label>
              <input id="phone" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={30} placeholder="+63 9XX XXX XXXX" />
            </>}
            <label htmlFor="email">Email address</label>
            <input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="you@example.com" />
            {mode !== "reset" && <>
              <label htmlFor="password">Password {(mode === "create" || mode === "update") && <span>8 CHARACTERS MINIMUM</span>}</label>
              <input id="password" type="password" autoComplete={mode === "create" || mode === "update" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} required minLength={mode === "create" || mode === "update" ? 8 : 1} placeholder="Enter your password" />
            </>}
            {error && <p className="auth-error" role="alert">{error}</p>}
            {message && <p className="auth-success" role="status"><CheckCircle2 size={15} />{message}</p>}
            <button className="auth-submit" type="submit" disabled={busy}>{busy ? <LoaderCircle size={16} className="loading-icon" /> : mode === "reset" ? <Mail size={16} /> : <ShieldCheck size={16} />}{mode === "create" ? "Create account" : mode === "reset" ? "Send reset link" : mode === "update" ? "Update password" : "Sign in"}</button>
          </form>
          {mode === "sign-in" && <button className="auth-text-button forgot" onClick={() => { setMode("reset"); setError(""); setMessage(""); }}>Forgot password?</button>}
          <div className="auth-switch">{mode === "create" ? "Already have an account?" : "New to GridSight?"}<button onClick={() => { setMode(mode === "create" ? "sign-in" : "create"); setError(""); setMessage(""); }}>{mode === "create" ? "Sign in" : "Create an account"}</button></div>
          {mode === "reset" && <button className="auth-text-button reset-back" onClick={() => { setMode("sign-in"); setError(""); setMessage(""); }}>Back to sign in</button>}
          <p className="auth-privacy"><ShieldCheck size={13} /> Your location is only used when you choose to add it to a report.</p>
        </div>
      </section>
    </main>
  );
}
