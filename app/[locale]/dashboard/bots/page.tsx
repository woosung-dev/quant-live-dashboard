import { CloudBotList } from "@/features/trade/components/CloudBotList";
import { Separator } from "@/components/ui/separator";

export default function CloudBotsPage() {
    return (
        <div className="container py-8 space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Cloud Bots (24/7)</h2>
                <p className="text-muted-foreground">
                    Manage your always-on trading bots running on the secure cloud server.
                </p>
            </div>
            <Separator />
            <CloudBotList />
        </div>
    );
}
