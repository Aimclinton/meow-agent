import { t } from '../i18n';
import { useEffect, useState } from 'react';
import { useDocumentStore, verifyPassword, hasRecoveryCode, generateRecoveryCode } from '../store/documentStore';
import { openVault, recoverVault, cloudEnabled, wasLinked, rememberPassword } from '../services/vault';
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
  const [cloud, setCloud] = useState(false);
  const [notice, setNotice] = useState('');
  const { authenticate, resetPasswordWithCode, resetEverything, adoptPassword, wipeLocalDocs, syncFromCloud } = useDocumentStore();

  useEffect(() => {
    hasRecoveryCode().then(setCanRecover).catch(() => setCanRecover(false));
    cloudEnabled().then(setCloud);
  }, []);

  const enter = () => {
    setHappy(true);
    syncFromCloud();
    setTimeout(authenticate, 450);
  };

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
        const r = await openVault(password).catch(() => ({ enabled: false }));
        if (r.enabled && !r.exists) {
          // The password was changed on another device (forgot-password flow).
          if (wasLinked()) return fail(t('รหัสผ่านนี้ถูกเปลี่ยนจากเครื่องอื่นแล้ว ใช้รหัสใหม่นะ'));
          // Older device that never synced: create its cloud history now.
          await openVault(password, { create: true }).catch(() => {});
        }
        await rememberPassword(password);
        enter();
        return;
      }
      // Not this device's password — maybe it's the password used on another device.
      const remote = await openVault(password).catch(() => ({}));
      if (remote.exists) {
        await wipeLocalDocs();
        await adoptPassword(password);
        await rememberPassword(password);
        enter();
        return;
      }
      fail(t('รหัสผ่านไม่ถูกต้อง'));
    } catch {
      fail(t('ตรวจสอบรหัสผ่านไม่สำเร็จ'));
    } finally {
      setBusy(false);
    }
  };

  const recover = async (e) => {
    e.preventDefault();
    if (newPass.length < 4) return fail(t('รหัสผ่านใหม่ต้องมีอย่างน้อย 4 ตัวอักษร'));
    setBusy(true);
    try {
      if (cloud) {
        const r = await recoverVault(recovery, newPass);
        if (r.reason === 'password_taken') return fail(t('รหัสผ่านนี้มีคนใช้แล้ว ลองตั้งรหัสอื่น'));
        if (r.ok) {
          const localOk = await resetPasswordWithCode(recovery, newPass);
          if (!localOk) {
            await wipeLocalDocs();
            await adoptPassword(newPass, recovery);
          }
          setNotice(t('ตั้งรหัสใหม่แล้ว ประวัติทุกเครื่องยังอยู่ครบ รหัสกู้คืนเดิมยังใช้ได้'));
          enter();
          return;
        }
      }
      const code = await resetPasswordWithCode(recovery, newPass);
      if (!code) return fail(t('รหัสกู้คืนไม่ถูกต้อง'));
      if (cloud) await openVault(newPass, { create: true, recoveryCode: code }).catch(() => {});
      setNewCode(code);
      setView('code');
    } finally {
      setBusy(false);
    }
  };

  const wipe = async (e) => {
    e.preventDefault();
    if (wipeText.trim().toUpperCase() !== 'RESET') return fail(t('พิมพ์คำว่า RESET เพื่อยืนยัน'));
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
              <h1 className="font-pixel text-3xl uppercase leading-tight">{t("ใส่รหัสผ่าน")}</h1>
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
              {busy ? t('กำลังตรวจสอบ...') : t('เข้าสู่ระบบ')}
            </button>
            <button type="button" onClick={() => go(canRecover || cloud ? 'forgot' : 'wipe')} className="font-menu w-full min-h-[44px] text-sm underline underline-offset-4 text-ink/70 hover:text-ink">
              {t("ลืมรหัสผ่าน?")}
            </button>
          </form>
        )}

        {view === 'forgot' && (
          <form onSubmit={recover} className="space-y-5">
            <div>
              <p className="text-xs uppercase tracking-wider text-ink/50 mb-2">Forgot password</p>
              <h1 className="font-pixel text-3xl uppercase leading-tight">{t("กู้คืนรหัสผ่าน")}</h1>
              <p className="text-sm text-ink/60 mt-2">{t("ใส่รหัสกู้คืน (MEOW-XXXX-XXXX-XXXX) ที่ได้ตอนตั้งรหัสผ่าน เอกสารทั้งหมดจะยังอยู่ครบ")}</p>
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
              placeholder={t("อย่างน้อย 4 ตัว")}
            />
            <ErrorNote>{error}</ErrorNote>
            <button disabled={busy || !recovery || !newPass} className="font-menu font-medium w-full min-h-[52px] bg-ink text-paper rounded-[3px] hover:bg-neutral-700 disabled:opacity-40 transition">
              {t("ตั้งรหัสผ่านใหม่")}
            </button>
            <div className="flex justify-between gap-3 text-sm font-menu">
              <button type="button" onClick={() => go('login')} className="min-h-[44px] underline underline-offset-4 text-ink/70">{t("‹ กลับ")}</button>
              <button type="button" onClick={() => go('wipe')} className="min-h-[44px] underline underline-offset-4 text-ink/70">{t("ไม่มีรหัสกู้คืน")}</button>
            </div>
          </form>
        )}

        {view === 'wipe' && (
          <form onSubmit={wipe} className="space-y-5">
            <div>
              <p className="text-xs uppercase tracking-wider text-red-700 mb-2">Reset device</p>
              <h1 className="font-pixel text-3xl uppercase leading-tight">{t("เริ่มใหม่ทั้งหมด")}</h1>
              <p className="text-sm text-ink/60 mt-2">
                {t("ถ้าไม่มีรหัสกู้คืน วิธีเดียวคือล้างข้อมูลในเครื่องนี้แล้วตั้งรหัสใหม่")} <b className="text-red-700">{t("เอกสารและประวัติทั้งหมดจะถูกลบ")}</b>
              </p>
            </div>
            <Field label={t('พิมพ์ "RESET" เพื่อยืนยัน')} value={wipeText} autoCapitalize="characters" onChange={(e) => { setWipeText(e.target.value); setError(''); }} placeholder="RESET" />
            <ErrorNote>{error}</ErrorNote>
            <button className="font-menu font-medium w-full min-h-[52px] bg-red-700 text-white rounded-[3px] hover:bg-red-800 transition">
              {t("ลบข้อมูลและเริ่มใหม่")}
            </button>
            <button type="button" onClick={() => go('login')} className="font-menu w-full min-h-[44px] text-sm underline underline-offset-4 text-ink/70">{t("‹ กลับไปหน้าเข้าสู่ระบบ")}</button>
          </form>
        )}

        {view === 'code' && newCode && <RecoveryCodeCard code={newCode} onDone={enter} />}
        {notice && <p className="text-sm border-l-2 border-[#e2782a] pl-3 py-1 mt-4">{notice}</p>}
      </div>
    </AuthShell>
  );
}
