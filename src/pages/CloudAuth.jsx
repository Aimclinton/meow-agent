import { useState } from 'react';
import { supabase } from '../lib/supabase';
import AuthShell, { Field, ErrorNote } from './auth/AuthShell';

const MSG = {
  'Invalid login credentials': 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
  'Email not confirmed': 'ยังไม่ได้ยืนยันอีเมล — เปิดลิงก์ในอีเมลก่อน',
  'User already registered': 'อีเมลนี้สมัครแล้ว ลองเข้าสู่ระบบ',
};
const th = (e) => MSG[e?.message] || e?.message || 'เกิดข้อผิดพลาด';

// Email + password login backed by Supabase Auth (used when Supabase is configured).
export default function CloudAuth({ recovery = false, onRecovered }) {
  const [view, setView] = useState(recovery ? 'recovery' : 'login'); // login | signup | forgot | recovery
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [typing, setTyping] = useState(false);
  const [shake, setShake] = useState(0);

  const go = (v) => { setView(v); setError(''); setInfo(''); };
  const fail = (m) => { setError(m); setShake((n) => n + 1); };
  const pw = { onFocus: () => setTyping(true), onBlur: () => setTyping(false) };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (view === 'login') {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) fail(th(err));
      } else if (view === 'signup') {
        if (password.length < 6) return fail('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
        const { data, error: err } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
        if (err) fail(th(err));
        else if (!data.session) setInfo('ส่งลิงก์ยืนยันไปที่อีเมลแล้ว เปิดลิงก์แล้วกลับมาเข้าสู่ระบบ');
      } else if (view === 'forgot') {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
        if (err) fail(th(err));
        else setInfo('ส่งลิงก์ตั้งรหัสผ่านใหม่ไปที่อีเมลแล้ว (ดูในกล่องสแปมด้วยนะ)');
      } else if (view === 'recovery') {
        if (password.length < 6) return fail('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
        const { error: err } = await supabase.auth.updateUser({ password });
        if (err) fail(th(err));
        else onRecovered?.();
      }
    } finally {
      setBusy(false);
    }
  };

  const titles = {
    login: ['Welcome back', 'เข้าสู่ระบบ', 'เข้าสู่ระบบ'],
    signup: ['New member', 'สมัครสมาชิก', 'สมัคร'],
    forgot: ['Forgot password', 'ลืมรหัสผ่าน', 'ส่งลิงก์ไปที่อีเมล'],
    recovery: ['Reset password', 'ตั้งรหัสผ่านใหม่', 'บันทึกรหัสผ่านใหม่'],
  }[view];

  return (
    <AuthShell mood={typing ? 'closed' : 'open'}>
      <form key={shake} onSubmit={submit} className={`space-y-5 ${shake ? 'shake' : ''}`}>
        <div>
          <p className="text-xs uppercase tracking-wider text-ink/50 mb-2">{titles[0]}</p>
          <h1 className="font-pixel text-3xl uppercase leading-tight">{titles[1]}</h1>
          <p className="text-sm text-ink/60 mt-2">ประวัติเอกสาร 7 วันจะซิงก์ทุกเครื่องที่ใช้บัญชีนี้</p>
        </div>
        {view !== 'recovery' && (
          <Field label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@clinic.com" required />
        )}
        {view !== 'forgot' && (
          <Field
            label={view === 'recovery' ? 'New password' : 'Password'}
            type="password"
            autoComplete={view === 'login' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••"
            required
            {...pw}
          />
        )}
        <ErrorNote>{error}</ErrorNote>
        {info && <p className="text-sm border-l-2 border-[#e2782a] pl-3 py-1">{info}</p>}
        <button disabled={busy} className="font-menu font-medium w-full min-h-[52px] bg-ink text-paper rounded-[3px] hover:bg-neutral-700 disabled:opacity-40 transition">
          {busy ? 'รอสักครู่...' : titles[2]}
        </button>
        <div className="flex justify-between gap-3 text-sm font-menu">
          {view === 'login' && (
            <>
              <button type="button" onClick={() => go('forgot')} className="min-h-[44px] underline underline-offset-4 text-ink/70">ลืมรหัสผ่าน?</button>
              <button type="button" onClick={() => go('signup')} className="min-h-[44px] underline underline-offset-4 text-ink/70">สมัครสมาชิก</button>
            </>
          )}
          {(view === 'signup' || view === 'forgot') && (
            <button type="button" onClick={() => go('login')} className="min-h-[44px] underline underline-offset-4 text-ink/70">‹ กลับไปเข้าสู่ระบบ</button>
          )}
        </div>
      </form>
    </AuthShell>
  );
}
