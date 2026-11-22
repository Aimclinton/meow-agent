import { t } from '../i18n';
import { useState } from 'react';
import { useDocumentStore, generateRecoveryCode } from '../store/documentStore';
import { openVault } from '../services/vault';
import AuthShell, { Field, ErrorNote, RecoveryCodeCard } from './auth/AuthShell';

export default function PasswordSetup() {
  const [password, setPasswordInput] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [typing, setTyping] = useState(false);
  const [code, setCode] = useState(null);
  const [busy, setBusy] = useState(false);
  const { setPassword, finishAuth, adoptPassword, syncFromCloud } = useDocumentStore();

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 4) return setError(t('รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร'));
    if (password !== confirm) return setError(t('รหัสผ่านสองช่องไม่ตรงกัน'));
    setBusy(true);
    try {
      // Same password used on another device? Join that history instead.
      const existing = await openVault(password).catch(() => ({ enabled: false }));
      if (existing.exists) {
        await adoptPassword(password);
        finishAuth();
        syncFromCloud();
        return;
      }
      const newCode = generateRecoveryCode();
      if (existing.enabled) await openVault(password, { create: true, recoveryCode: newCode });
      setCode(await setPassword(password, newCode));
    } catch {
      setError(t('บันทึกรหัสผ่านไม่สำเร็จ ลองใหม่อีกครั้ง'));
    } finally {
      setBusy(false);
    }
  };

  if (code) {
    return (
      <AuthShell mood="happy">
        <RecoveryCodeCard code={code} onDone={finishAuth} />
      </AuthShell>
    );
  }

  return (
    <AuthShell mood={typing ? 'closed' : 'open'}>
      <form onSubmit={submit} className="space-y-5">
        <div>
          <p className="text-xs uppercase tracking-wider text-ink/50 mb-2">First time</p>
          <h1 className="font-pixel text-3xl uppercase leading-tight">{t("ตั้งรหัสผ่าน")}</h1>
          <p className="text-sm text-ink/60 mt-2">{t("ใช้ล็อกเอกสารและประวัติ 7 วัน ใส่รหัสเดียวกันในเครื่องอื่นแล้วประวัติจะตามไปด้วย (แมวจะไม่แอบดู)")}</p>
        </div>
        <Field
          label="Password"
          type="password"
          autoComplete="new-password"
          value={password}
          onFocus={() => setTyping(true)}
          onBlur={() => setTyping(false)}
          onChange={(e) => { setPasswordInput(e.target.value); setError(''); }}
          placeholder={t("อย่างน้อย 4 ตัว")}
        />
        <Field
          label="Confirm"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onFocus={() => setTyping(true)}
          onBlur={() => setTyping(false)}
          onChange={(e) => { setConfirm(e.target.value); setError(''); }}
          placeholder={t("พิมพ์อีกครั้ง")}
        />
        <ErrorNote>{error}</ErrorNote>
        <button disabled={busy} className="font-menu font-medium w-full min-h-[52px] bg-ink text-paper rounded-[3px] hover:bg-neutral-700 disabled:opacity-50 transition">
          {busy ? t('กำลังบันทึก...') : t('ตั้งรหัสผ่าน')}
        </button>
      </form>
    </AuthShell>
  );
}
