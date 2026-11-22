import { useEffect, useState } from 'react';
import { useDocumentStore, verifyPassword, hasRecoveryCode } from '../store/documentStore';
import AuthShell, { Field, ErrorNote, RecoveryCodeCard } from './auth/AuthShell';

export default function PasswordLogin() {
  const [view, setView] = useState('login'); // login | forgot | wipe | code
  const [password, setPasswordInput] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [typing, setTyping] = useState(false);
  const [shake, setShake] = useState(0);
  const [happy, setHappy] = useState(false);
  const [canRecover, setCanRecover] = useState(true);
  const [recovery, setRecovery] = useState('');
  const [newPass, setNewPass] = useState('');
  const [newCode, setNewCode] = useState(null);
  const [wipeText, setWipeText] = useState('');
  const { authenticate, resetPasswordWithCode, resetEverything } = useDocumentStore();

  useEffect(() => {
    hasRecoveryCode().then(setCanRecover).catch(() => setCanRecover(false));
  }, []);

  const fail = (msg) => {
    setError(msg);
    setShake((n) => n + 1);
  };

  const login = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (await verifyPassword(password)) {
        setHappy(true);
        setTimeout(authenticate, 450);
      } else {
        fail('รหัสผ่านไม่ถูกต้อง');
      }
    } catch {
      fail('ตรวจสอบรหัสผ่านไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

  const recover = async (e) => {
    e.preventDefault();
    if (newPass.length < 4) return fail('รหัสผ่านใหม่ต้องมีอย่างน้อย 4 ตัวอักษร');
    setBusy(true);
    try {
      const code = await resetPasswordWithCode(recovery, newPass);
      if (!code) return fail('รหัสกู้คืนไม่ถูกต้อง');
      setNewCode(code);
      setView('code');
    } finally {
      setBusy(false);
    }
  };

  const wipe = async (e) => {
    e.preventDefault();
    if (wipeText.trim().toUpperCase() !== 'RESET') return fail('พิมพ์คำว่า RESET เพื่อยืนยัน');
    await resetEverything();
  };

  const go = (v) => { setView(v); setError(''); };
  const mood = happy || view === 'code' ? 'happy' : typing ? 'closed' : 'open';

  return (
    <AuthShell mood={mood} shake={false}>
      <div key={shake} className={shake ? 'shake' : ''}>
        {view === 'login' && (
          <form onSubmit={login} className="space-y-5">
            <div>
              <p className="text-xs uppercase tracking-wider text-ink/50 mb-2">Welcome back</p>
              <h1 className="font-pixel text-3xl uppercase leading-tight">ใส่รหัสผ่าน</h1>
            </div>
            <Field
              label="Password"
              type="password"
              autoComplete="current-password"
              autoFocus
              value={password}
              onFocus={() => setTyping(true)}
              onBlur={() => setTyping(false)}
              onChange={(e) => { setPasswordInput(e.target.value); setError(''); }}
              placeholder="••••"
              disabled={busy}
            />
            <ErrorNote>{error}</ErrorNote>
            <button disabled={busy || !password} className="font-menu font-medium w-full min-h-[52px] bg-ink text-paper rounded-[3px] hover:bg-neutral-700 disabled:opacity-40 transition">
              {busy ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}
            </button>
            <button type="button" onClick={() => go(canRecover ? 'forgot' : 'wipe')} className="font-menu w-full min-h-[44px] text-sm underline underline-offset-4 text-ink/70 hover:text-ink">
              ลืมรหัสผ่าน?
            </button>
          </form>
        )}

        {view === 'forgot' && (
          <form onSubmit={recover} className="space-y-5">
            <div>
              <p className="text-xs uppercase tracking-wider text-ink/50 mb-2">Forgot password</p>
              <h1 className="font-pixel text-3xl uppercase leading-tight">กู้คืนรหัสผ่าน</h1>
              <p className="text-sm text-ink/60 mt-2">ใส่รหัสกู้คืน (MEOW-XXXX-XXXX-XXXX) ที่ได้ตอนตั้งรหัสผ่าน เอกสารทั้งหมดจะยังอยู่ครบ</p>
            </div>
            <Field
              label="Recovery code"
              value={recovery}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => { setRecovery(e.target.value); setError(''); }}
              placeholder="MEOW-XXXX-XXXX-XXXX"
            />
            <Field
              label="New password"
              type="password"
              autoComplete="new-password"
              value={newPass}
              onFocus={() => setTyping(true)}
              onBlur={() => setTyping(false)}
              onChange={(e) => { setNewPass(e.target.value); setError(''); }}
              placeholder="อย่างน้อย 4 ตัว"
            />
            <ErrorNote>{error}</ErrorNote>
            <button disabled={busy || !recovery || !newPass} className="font-menu font-medium w-full min-h-[52px] bg-ink text-paper rounded-[3px] hover:bg-neutral-700 disabled:opacity-40 transition">
              ตั้งรหัสผ่านใหม่
            </button>
            <div className="flex justify-between gap-3 text-sm font-menu">
              <button type="button" onClick={() => go('login')} className="min-h-[44px] underline underline-offset-4 text-ink/70">‹ กลับ</button>
              <button type="button" onClick={() => go('wipe')} className="min-h-[44px] underline underline-offset-4 text-ink/70">ไม่มีรหัสกู้คืน</button>
            </div>
          </form>
        )}

        {view === 'wipe' && (
          <form onSubmit={wipe} className="space-y-5">
            <div>
              <p className="text-xs uppercase tracking-wider text-red-700 mb-2">Reset device</p>
              <h1 className="font-pixel text-3xl uppercase leading-tight">เริ่มใหม่ทั้งหมด</h1>
              <p className="text-sm text-ink/60 mt-2">
                ถ้าไม่มีรหัสกู้คืน วิธีเดียวคือล้างข้อมูลในเครื่องนี้แล้วตั้งรหัสใหม่ <b className="text-red-700">เอกสารและประวัติทั้งหมดจะถูกลบ</b>
              </p>
            </div>
            <Field label='พิมพ์ "RESET" เพื่อยืนยัน' value={wipeText} autoCapitalize="characters" onChange={(e) => { setWipeText(e.target.value); setError(''); }} placeholder="RESET" />
            <ErrorNote>{error}</ErrorNote>
            <button className="font-menu font-medium w-full min-h-[52px] bg-red-700 text-white rounded-[3px] hover:bg-red-800 transition">
              ลบข้อมูลและเริ่มใหม่
            </button>
            <button type="button" onClick={() => go('login')} className="font-menu w-full min-h-[44px] text-sm underline underline-offset-4 text-ink/70">‹ กลับไปหน้าเข้าสู่ระบบ</button>
          </form>
        )}

        {view === 'code' && newCode && <RecoveryCodeCard code={newCode} onDone={authenticate} />}
      </div>
    </AuthShell>
  );
}
