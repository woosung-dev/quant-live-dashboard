
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

interface SaveStrategyDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (name: string) => void;
    defaultName?: string;
}

export function SaveStrategyDialog({
    open,
    onOpenChange,
    onSave,
    defaultName = "",
}: SaveStrategyDialogProps) {
    const [name, setName] = useState(defaultName);

    const handleSave = () => {
        onSave(name);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Save Strategy</DialogTitle>
                    <DialogDescription>
                        Enter a name for your custom strategy to save it.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                            Name
                        </Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="col-span-3"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleSave} disabled={!name.trim()}>Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
