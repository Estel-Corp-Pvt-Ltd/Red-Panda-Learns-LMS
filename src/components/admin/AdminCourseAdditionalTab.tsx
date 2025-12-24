import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface AdditionalTabProps {
  isMailSendingEnabled: boolean;
  setIsMailSendingEnabled: (value: boolean) => void;
  isCertificateEnabled?: boolean;
  setIsCertificateEnabled?: (value: boolean) => void;
  onSave: () => Promise<void> | void;
};

const AdditionalTab = ({
  isMailSendingEnabled,
  setIsMailSendingEnabled,
  isCertificateEnabled,
  setIsCertificateEnabled,
  onSave,
}: AdditionalTabProps) => {
  return (
    <div className="space-y-6 p-6 bg-card rounded-lg border">
      <h2 className="text-xl font-semibold">Additional Settings</h2>

      {/* Mail Sending Toggle */}
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div className="space-y-1">
          <Label htmlFor="mail-sending" className="text-base font-medium">
            Enable Mail Sending
          </Label>
          <p className="text-sm text-muted-foreground">
            When enabled, email notifications will be automatically sent to
            students enrolled in the course whenever a new assignment or lesson
            is added.
            <br />
            If not enabled, an announcement will still be created for the added
            assignment or lesson, but no email notifications will be sent.
          </p>
        </div>

        <Switch
          id="mail-sending"
          checked={isMailSendingEnabled}
          onCheckedChange={setIsMailSendingEnabled}
          className="bg-gray-200 dark:bg-gray-700 dark:data-[state=checked]:bg-primary"
        />
      </div>

      {/* Certificate Toggle */}
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div className="space-y-1">
          <Label htmlFor="enable-certificate" className="text-base font-medium">
            Enable Certificate
          </Label>
          <p className="text-sm text-muted-foreground">
            When enabled, students will receive a certificate upon completing
            the course.
            <br />
            Disabling this option will prevent students from receiving a
            certificate.
          </p>
        </div>

        <Switch
          id="enable-certificate"
          checked={isCertificateEnabled}
          onCheckedChange={(checked) => setIsCertificateEnabled?.(checked)}
          className="bg-gray-200 dark:bg-gray-700 dark:data-[state=checked]:bg-primary"
        />
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={onSave}>Save Settings</Button>
      </div>
    </div>
  );
};

export default AdditionalTab;
