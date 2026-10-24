import { PageHeader } from "@/components/shared/page-header";
import { SettingEditor } from "@/features/admin/components/admin-forms";
import { listSettings } from "@/features/admin/queries";
import { requireAdminPermission } from "@/lib/auth/session";

export default async function AdminSettingsPage() {
  await requireAdminPermission("settings.manage");
  const settings = await listSettings();
  return (
    <div className="max-w-4xl space-y-5">
      <PageHeader title="Platform settings" description="Values are JSON: numbers (10), booleans (true) or quoted text (&quot;GHS&quot;). A setting's type cannot change. Every change is audited." />
      <div className="space-y-3">
        {settings.map((s) => <SettingEditor key={s.key} settingKey={s.key} value={JSON.stringify(s.value)} description={s.description} />)}
      </div>
    </div>
  );
}
