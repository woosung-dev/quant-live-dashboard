'use client';

import { Clock } from 'lucide-react';

interface Activity {
    id: string;
    type: 'strategy_created' | 'backtest_run' | 'strategy_updated';
    message: string;
    timestamp: string;
}

interface ActivityFeedProps {
    activities?: Activity[];
}

export const ActivityFeed = ({ activities = [] }: ActivityFeedProps) => {
    // Mock data for now
    const mockActivities: Activity[] = activities.length > 0 ? activities : [
        {
            id: '1',
            type: 'backtest_run',
            message: 'SMA 크로스오버 전략 백테스트 완료',
            timestamp: '5분 전'
        },
        {
            id: '2',
            type: 'strategy_created',
            message: '새로운 RSI 전략 생성',
            timestamp: '1시간 전'
        },
        {
            id: '3',
            type: 'strategy_updated',
            message: 'MACD 전략 파라미터 수정',
            timestamp: '3시간 전'
        }
    ];

    const getTypeColor = (type: Activity['type']) => {
        switch (type) {
            case 'strategy_created':
                return 'bg-green-500/20 text-green-500';
            case 'backtest_run':
                return 'bg-blue-500/20 text-blue-500';
            case 'strategy_updated':
                return 'bg-yellow-500/20 text-yellow-500';
            default:
                return 'bg-gray-500/20 text-gray-500';
        }
    };

    return (
        <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-lg font-bold mb-4">최근 활동</h3>

            <div className="space-y-4">
                {mockActivities.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-4">
                        <div className={`w-2 h-2 rounded-full mt-2 ${getTypeColor(activity.type).split(' ')[0]}`} />
                        <div className="flex-1">
                            <p className="text-sm text-foreground">{activity.message}</p>
                            <div className="flex items-center gap-1 mt-1">
                                <Clock size={12} className="text-gray-500" />
                                <span className="text-xs text-gray-500">{activity.timestamp}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
