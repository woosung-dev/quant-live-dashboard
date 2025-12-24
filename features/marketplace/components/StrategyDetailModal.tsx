"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Star, Download, User, Calendar, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface StrategyDetail {
    id: string;
    title: string;
    description: string;
    tags: string[];
    avg_rating: number;
    rating_count: number;
    downloads: number;
    published_at: string;
    author: {
        full_name: string | null;
        email: string;
    };
    strategy: {
        name: string;
        type: string;
        code: string | null;
        parameters: any;
    };
}

interface Comment {
    id: string;
    content: string;
    created_at: string;
    author: {
        full_name: string | null;
        email: string;
    };
}

interface StrategyDetailModalProps {
    strategyId: string;
    isOpen: boolean;
    onClose: () => void;
}

export function StrategyDetailModal({ strategyId, isOpen, onClose }: StrategyDetailModalProps) {
    const [strategy, setStrategy] = useState<StrategyDetail | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [userRating, setUserRating] = useState<number | null>(null);
    const [hoverRating, setHoverRating] = useState<number | null>(null);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!isOpen || !strategyId) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch public strategy details
                const res = await fetch(`/api/strategies/public`);
                if (res.ok) {
                    const data = await res.json();
                    const found = data.strategies.find((s: any) => s.strategy_id === strategyId);
                    if (found) {
                        setStrategy(found);
                    }
                }

                // Fetch comments
                const commentsRes = await fetch(`/api/strategies/${strategyId}/comments`);
                if (commentsRes.ok) {
                    const commentsData = await commentsRes.json();
                    setComments(commentsData.comments || []);
                }

                // Fetch user rating
                const ratingRes = await fetch(`/api/strategies/${strategyId}/rate`);
                if (ratingRes.ok) {
                    const ratingData = await ratingRes.json();
                    setUserRating(ratingData.rating);
                }
            } catch (e) {
                console.error('Failed to fetch strategy details:', e);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [strategyId, isOpen]);

    const handleRate = async (rating: number) => {
        try {
            const res = await fetch(`/api/strategies/${strategyId}/rate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rating })
            });

            if (res.ok) {
                setUserRating(rating);
                toast.success(`Rated ${rating} stars!`);
                // Refresh strategy to update avg_rating
                const publicRes = await fetch(`/api/strategies/public`);
                if (publicRes.ok) {
                    const data = await publicRes.json();
                    const found = data.strategies.find((s: any) => s.strategy_id === strategyId);
                    if (found) setStrategy(found);
                }
            } else {
                toast.error('Failed to submit rating');
            }
        } catch (e) {
            toast.error('Failed to submit rating');
        }
    };

    const handleDownload = async () => {
        if (!strategy) return;

        try {
            // Copy strategy to user's personal strategies
            const res = await fetch(`/api/strategies`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: `${strategy.title} (Downloaded)`,
                    type: strategy.strategy?.type || 'unknown',
                    code: strategy.strategy?.code || '',
                    parameters: strategy.strategy?.parameters || {}
                })
            });

            if (res.ok) {
                // Increment download count
                await fetch(`/api/strategies/${strategyId}/download`, { method: 'POST' });
                toast.success('Strategy downloaded to your library!');
                onClose();
            } else {
                toast.error('Failed to download strategy');
            }
        } catch (e) {
            toast.error('Failed to download strategy');
        }
    };

    const handlePostComment = async () => {
        if (!newComment.trim()) return;

        setSubmitting(true);
        try {
            const res = await fetch(`/api/strategies/${strategyId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: newComment.trim() })
            });

            if (res.ok) {
                const data = await res.json();
                setComments([data.comment, ...comments]);
                setNewComment('');
                toast.success('Comment posted!');
            } else {
                toast.error('Failed to post comment');
            }
        } catch (e) {
            toast.error('Failed to post comment');
        } finally {
            setSubmitting(false);
        }
    };

    const renderStars = (rating: number, interactive = false) => {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            const filled = i <= (hoverRating || rating);
            stars.push(
                <Star
                    key={i}
                    className={`w-6 h-6 ${interactive ? 'cursor-pointer' : ''} ${filled ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                    onClick={() => interactive && handleRate(i)}
                    onMouseEnter={() => interactive && setHoverRating(i)}
                    onMouseLeave={() => interactive && setHoverRating(null)}
                />
            );
        }
        return stars;
    };

    if (loading) {
        return (
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Loading Strategy...</DialogTitle>
                    </DialogHeader>
                    <div className="py-10 text-center text-muted-foreground">Loading...</div>
                </DialogContent>
            </Dialog>
        );
    }

    if (!strategy) {
        return null;
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{strategy.title}</DialogTitle>
                    <DialogDescription>
                        <span className="flex items-center gap-2 mt-2">
                            <User className="w-4 h-4" />
                            <span>{strategy.author?.full_name || strategy.author?.email || 'Unknown'}</span>
                            <span>•</span>
                            <Calendar className="w-4 h-4" />
                            <span>{format(new Date(strategy.published_at), 'PPP')}</span>
                        </span>
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="info" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="info">Info</TabsTrigger>
                        <TabsTrigger value="code">Code</TabsTrigger>
                        <TabsTrigger value="reviews">Reviews</TabsTrigger>
                    </TabsList>

                    <TabsContent value="info" className="space-y-4 mt-4">
                        <div>
                            <h4 className="font-semibold mb-2">Description</h4>
                            <p className="text-sm text-muted-foreground">{strategy.description || 'No description provided.'}</p>
                        </div>

                        {strategy.tags && strategy.tags.length > 0 && (
                            <div>
                                <h4 className="font-semibold mb-2">Tags</h4>
                                <div className="flex flex-wrap gap-2">
                                    {strategy.tags.map((tag) => (
                                        <Badge key={tag} variant="secondary">#{tag}</Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div>
                            <h4 className="font-semibold mb-2">Parameters</h4>
                            <pre className="text-xs bg-muted p-3 rounded overflow-auto">
                                {JSON.stringify(strategy.strategy?.parameters || {}, null, 2)}
                            </pre>
                        </div>
                    </TabsContent>

                    <TabsContent value="code" className="mt-4">
                        <pre className="text-xs bg-muted p-4 rounded overflow-auto max-h-96">
                            {strategy.strategy?.code || '// No code available'}
                        </pre>
                    </TabsContent>

                    <TabsContent value="reviews" className="space-y-4 mt-4">
                        {/* Rating */}
                        <div className="space-y-2">
                            <h4 className="font-semibold">Rate this strategy</h4>
                            <div className="flex items-center gap-2">
                                {renderStars(userRating || 0, true)}
                                {userRating && <span className="text-sm">({userRating}/5)</span>}
                            </div>
                        </div>

                        <Separator />

                        {/* Comments */}
                        <div className="space-y-3">
                            <h4 className="font-semibold flex items-center gap-2">
                                <MessageSquare className="w-4 h-4" />
                                Comments ({comments.length})
                            </h4>

                            {/* New Comment */}
                            <div className="space-y-2">
                                <Textarea
                                    placeholder="Write a comment..."
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    rows={3}
                                />
                                <Button onClick={handlePostComment} disabled={submitting || !newComment.trim()}>
                                    Post Comment
                                </Button>
                            </div>

                            <Separator />

                            {/* Comment List */}
                            <div className="space-y-3 max-h-64 overflow-y-auto">
                                {comments.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-4">No comments yet</p>
                                ) : (
                                    comments.map((comment) => (
                                        <div key={comment.id} className="bg-muted p-3 rounded">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-sm font-semibold">
                                                    {comment.author.full_name || comment.author.email}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {format(new Date(comment.created_at), 'PPp')}
                                                </span>
                                            </div>
                                            <p className="text-sm">{comment.content}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>

                <Separator />

                {/* Actions */}
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                            {renderStars(strategy.avg_rating)}
                            <span className="ml-1">{strategy.avg_rating.toFixed(1)} ({strategy.rating_count})</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Download className="w-4 h-4" />
                            <span>{strategy.downloads.toLocaleString()}</span>
                        </div>
                    </div>
                    <Button onClick={handleDownload}>
                        <Download className="w-4 h-4 mr-2" />
                        Download Strategy
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
