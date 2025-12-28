import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Check, Settings2, Video, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ParallelChatSettingsPanelProps {
  currentValue: number;
  onSave: (value: number) => Promise<void>;
  isLoading?: boolean;
  currentCallValue?: number;
  onSaveCallLimit?: (value: number) => Promise<void>;
  showCallSettings?: boolean;
}

const ParallelChatSettingsPanel = ({
  currentValue,
  onSave,
  isLoading,
  currentCallValue = 3,
  onSaveCallLimit,
  showCallSettings = false
}: ParallelChatSettingsPanelProps) => {
  const { toast } = useToast();
  const [selectedChatValue, setSelectedChatValue] = useState(currentValue.toString());
  const [selectedCallValue, setSelectedCallValue] = useState(currentCallValue.toString());
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveChats = async () => {
    setIsSaving(true);
    try {
      await onSave(Number(selectedChatValue));
      toast({
        title: "Settings Saved",
        description: `Maximum parallel chats set to ${selectedChatValue}`,
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCalls = async () => {
    if (!onSaveCallLimit) return;
    setIsSaving(true);
    try {
      await onSaveCallLimit(Number(selectedCallValue));
      toast({
        title: "Settings Saved",
        description: `Maximum parallel calls set to ${selectedCallValue}`,
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const chatOptions = [
    { value: "1", label: "1 Chat", description: "Focus on one conversation" },
    { value: "2", label: "2 Chats", description: "Moderate multitasking" },
    { value: "3", label: "3 Chats", description: "Maximum parallel chats" }
  ];

  const callOptions = [
    { value: "1", label: "1 Call", description: "One call at a time" },
    { value: "2", label: "2 Calls", description: "Handle two calls" },
    { value: "3", label: "3 Calls", description: "Maximum parallel calls" }
  ];

  const hasChatChanges = selectedChatValue !== currentValue.toString();
  const hasCallChanges = selectedCallValue !== currentCallValue.toString();

  const renderOptions = (
    options: typeof chatOptions, 
    selectedValue: string, 
    setSelectedValue: (v: string) => void,
    icon: typeof MessageSquare
  ) => (
    <RadioGroup
      value={selectedValue}
      onValueChange={setSelectedValue}
      className="grid grid-cols-3 gap-3"
      disabled={isLoading}
    >
      {options.map((option) => {
        const Icon = icon;
        return (
          <div key={option.value} className="relative">
            <RadioGroupItem
              value={option.value}
              id={`option-${option.value}-${icon.name}`}
              className="peer sr-only"
            />
            <Label
              htmlFor={`option-${option.value}-${icon.name}`}
              className={cn(
                "flex flex-col items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all text-center",
                "hover:border-primary/50 hover:bg-primary/5",
                selectedValue === option.value
                  ? "border-primary bg-primary/10"
                  : "border-border"
              )}
            >
              <div className="flex items-center gap-1 mb-1">
                {Array.from({ length: Number(option.value) }).map((_, i) => (
                  <Icon
                    key={i}
                    className={cn(
                      "h-4 w-4",
                      selectedValue === option.value
                        ? "text-primary"
                        : "text-muted-foreground"
                    )}
                  />
                ))}
              </div>
              <span className="font-semibold text-sm">{option.label}</span>
              <span className="text-[10px] text-muted-foreground mt-0.5">
                {option.description}
              </span>
              {selectedValue === option.value && (
                <Check className="absolute top-1.5 right-1.5 h-3.5 w-3.5 text-primary" />
              )}
            </Label>
          </div>
        );
      })}
    </RadioGroup>
  );

  if (showCallSettings && onSaveCallLimit) {
    return (
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings2 className="h-4 w-4 text-primary" />
            Parallel Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs defaultValue="chats" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="chats" className="gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" />
                Chats
              </TabsTrigger>
              <TabsTrigger value="calls" className="gap-1.5">
                <Video className="h-3.5 w-3.5" />
                Calls
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="chats" className="space-y-4 pt-4">
              <Label className="text-sm text-muted-foreground block">
                How many chat windows at once?
              </Label>
              {renderOptions(chatOptions, selectedChatValue, setSelectedChatValue, MessageSquare)}
              <Button
                onClick={handleSaveChats}
                disabled={!hasChatChanges || isSaving || isLoading}
                className="w-full gap-2"
                size="sm"
              >
                {isSaving ? "Saving..." : <><Check className="h-4 w-4" /> Save Chat Limit</>}
              </Button>
            </TabsContent>
            
            <TabsContent value="calls" className="space-y-4 pt-4">
              <Label className="text-sm text-muted-foreground block">
                How many video calls at once?
              </Label>
              {renderOptions(callOptions, selectedCallValue, setSelectedCallValue, Video)}
              <Button
                onClick={handleSaveCalls}
                disabled={!hasCallChanges || isSaving || isLoading}
                className="w-full gap-2"
                size="sm"
              >
                {isSaving ? "Saving..." : <><Check className="h-4 w-4" /> Save Call Limit</>}
              </Button>
            </TabsContent>
          </Tabs>

          <p className="text-[10px] text-muted-foreground text-center">
            When you reach max, oldest windows will be replaced by new ones
          </p>
        </CardContent>
      </Card>
    );
  }

  // Simple chat-only view
  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Settings2 className="h-4 w-4 text-primary" />
          Parallel Chat Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-sm text-muted-foreground mb-3 block">
            How many chat windows do you want open at once?
          </Label>
          {renderOptions(chatOptions, selectedChatValue, setSelectedChatValue, MessageSquare)}
        </div>

        <Button
          onClick={handleSaveChats}
          disabled={!hasChatChanges || isSaving || isLoading}
          className="w-full gap-2"
          size="sm"
        >
          {isSaving ? (
            <>Saving...</>
          ) : (
            <>
              <Check className="h-4 w-4" />
              Save Preference
            </>
          )}
        </Button>

        <p className="text-[10px] text-muted-foreground text-center">
          When you reach max chats, oldest chat windows will be replaced by new ones
        </p>
      </CardContent>
    </Card>
  );
};

export default ParallelChatSettingsPanel;