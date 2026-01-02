import { CloudBotList } from "@/features/trade/components/CloudBotList";
import { Separator } from "@/components/ui/separator";
import { useTranslations } from "next-intl";

export default function CloudBotsPage() {
    const t = useTranslations('CloudBots');
    return (
        <div className="container py-8 space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">{t('title')}</h2>
                <p className="text-muted-foreground">
                    {t('description')}
                </p>
            </div>
            <Separator />
            <CloudBotList />
        </div>
    );
}
