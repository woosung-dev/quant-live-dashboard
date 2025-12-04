import { Card } from '@/components/ui/card';

export default function SettingsPage() {
    return (
        <div className="max-w-4xl space-y-8">
            <h1 className="text-3xl font-bold">Settings</h1>

            {/* API Keys */}
            <section>
                <h2 className="text-xl font-bold mb-4">Exchange API Keys</h2>
                <Card className="p-6 space-y-4">
                    <div className="flex justify-between items-center border-b pb-4">
                        <div>
                            <h3 className="font-bold">Binance</h3>
                            <p className="text-sm text-gray-500">Read & Trade permissions</p>
                        </div>
                        <div className="flex gap-2">
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Connected</span>
                            <button className="text-sm text-red-500 hover:underline">Remove</button>
                        </div>
                    </div>
                    <button className="w-full py-2 border border-dashed border-gray-300 rounded-lg text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                        + Add New Exchange Key
                    </button>
                </Card>
            </section>

            {/* Notifications */}
            <section>
                <h2 className="text-xl font-bold mb-4">Notifications</h2>
                <Card className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-medium">Trade Executions</h3>
                            <p className="text-sm text-gray-500">Get notified when a bot executes a trade</p>
                        </div>
                        <input type="checkbox" className="toggle" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-medium">Daily Summary</h3>
                            <p className="text-sm text-gray-500">Receive a daily PnL report via email</p>
                        </div>
                        <input type="checkbox" className="toggle" />
                    </div>
                </Card>
            </section>

            {/* Account */}
            <section>
                <h2 className="text-xl font-bold mb-4">Account</h2>
                <Card className="p-6">
                    <div className="grid gap-4 max-w-sm">
                        <div>
                            <label className="block text-sm font-medium mb-1">Email</label>
                            <input type="email" value="user@example.com" disabled className="w-full p-2 border rounded bg-gray-50" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Password</label>
                            <button className="text-primary hover:underline text-sm">Change Password</button>
                        </div>
                    </div>
                </Card>
            </section>
        </div>
    );
}
