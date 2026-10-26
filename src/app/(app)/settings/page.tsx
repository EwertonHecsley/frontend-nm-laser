import { PageHeader } from "@/components/layout/page-header";
import { ChangePasswordForm } from "@/features/auth/components/change-password-form";

export const metadata = {
  title: "Configurações",
};

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações"
        description="Gerencie a segurança da sua conta."
      />
      <ChangePasswordForm />
    </div>
  );
}
