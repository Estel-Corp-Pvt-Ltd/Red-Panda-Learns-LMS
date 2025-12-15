// AdditionalTab.tsx (or AdminCourseAdditionalTab.tsx)

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface AdditionalTabProps {
  isMailSendingEnabled: boolean;
  setIsMailSendingEnabled: (value: boolean) => void;
  onSave: () => Promise<void> | void; // Add this line
}

const AdditionalTab = ({
  isMailSendingEnabled,
  setIsMailSendingEnabled,
  onSave, // Add this
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
            Send email notifications to enrolled students
          </p>
        </div>
        <Switch
          id="mail-sending"
          checked={isMailSendingEnabled}
          onCheckedChange={setIsMailSendingEnabled}
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