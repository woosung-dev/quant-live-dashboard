'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function TestDBPage() {
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');
    const [details, setDetails] = useState<any>(null);

    useEffect(() => {
        const testConnection = async () => {
            try {
                // 1. Supabase 클라이언트 초기화 확인
                if (!supabase) {
                    throw new Error('Supabase client not initialized');
                }

                // 2. 데이터베이스 연결 테스트 (간단한 쿼리)
                const { data, error } = await supabase
                    .from('profiles')
                    .select('count')
                    .limit(1);

                if (error) {
                    // 테이블이 없을 수도 있으므로 에러 메시지 확인
                    if (error.message.includes('relation') || error.message.includes('does not exist')) {
                        setStatus('error');
                        setMessage('테이블이 생성되지 않았습니다. schema.sql을 실행해주세요.');
                        setDetails({ error: error.message });
                    } else {
                        throw error;
                    }
                } else {
                    setStatus('success');
                    setMessage('Supabase 연결 성공!');
                    setDetails({
                        connected: true,
                        url: process.env.NEXT_PUBLIC_SUPABASE_URL,
                        tablesChecked: 'profiles'
                    });
                }
            } catch (err: any) {
                setStatus('error');
                setMessage('연결 실패');
                setDetails({ error: err.message });
            }
        };

        testConnection();
    }, []);

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="max-w-2xl w-full bg-card border border-border rounded-xl p-8">
                <h1 className="text-3xl font-bold mb-6">Supabase 연결 테스트</h1>

                <div className="space-y-6">
                    {/* Status */}
                    <div className="flex items-center gap-4">
                        {status === 'loading' && (
                            <>
                                <Loader2 className="animate-spin text-gray-500" size={32} />
                                <span className="text-gray-400">연결 확인 중...</span>
                            </>
                        )}
                        {status === 'success' && (
                            <>
                                <CheckCircle className="text-green-500" size={32} />
                                <span className="text-green-500 font-bold">{message}</span>
                            </>
                        )}
                        {status === 'error' && (
                            <>
                                <XCircle className="text-red-500" size={32} />
                                <span className="text-red-500 font-bold">{message}</span>
                            </>
                        )}
                    </div>

                    {/* Details */}
                    {details && (
                        <div className="bg-background border border-border rounded-lg p-4">
                            <h3 className="text-sm font-bold mb-2 text-gray-400">상세 정보:</h3>
                            <pre className="text-xs text-gray-300 overflow-auto">
                                {JSON.stringify(details, null, 2)}
                            </pre>
                        </div>
                    )}

                    {/* Instructions */}
                    {status === 'error' && (
                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                            <h3 className="text-yellow-500 font-bold mb-2">해결 방법:</h3>
                            <ol className="text-sm text-gray-300 space-y-2 list-decimal list-inside">
                                <li>.env.local 파일에 NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_ANON_KEY가 올바르게 설정되어 있는지 확인</li>
                                <li>Supabase 대시보드 → SQL Editor에서 supabase/schema.sql 실행</li>
                                <li>개발 서버 재시작 (npm run dev)</li>
                            </ol>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                            <h3 className="text-green-500 font-bold mb-2">✅ 다음 단계:</h3>
                            <p className="text-sm text-gray-300">
                                이제 Auth 페이지를 완성할 준비가 되었습니다!
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
